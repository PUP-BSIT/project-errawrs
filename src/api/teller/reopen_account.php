<?php
// Enable CORS for localhost development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once '../../config/database.php';

// Add error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get database connection
    $conn = db_connect();

    // Get input
    $data = json_decode(file_get_contents('php://input'), true);
    $account_number = isset($data['account_number']) ? trim($data['account_number']) : '';
    $teller_number = isset($data['teller_number']) ? trim($data['teller_number']) : '';
    $reason = isset($data['reason']) ? trim($data['reason']) : 'Account reopened by teller';

    // Validate input
    if (empty($account_number) || empty($teller_number)) {
        throw new Exception('Account number and teller number are required.');
    }

    // Start transaction
    mysqli_autocommit($conn, false);

    try {
        // Verify teller exists and is active
        $teller_sql = "SELECT teller_id, teller_number, status FROM teller WHERE teller_number = ?";
        $teller_stmt = mysqli_prepare($conn, $teller_sql);
        mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
        mysqli_stmt_execute($teller_stmt);
        $teller_result = mysqli_stmt_get_result($teller_stmt);
        
        if (mysqli_num_rows($teller_result) !== 1) {
            throw new Exception('Invalid teller number.');
        }
        
        $teller = mysqli_fetch_assoc($teller_result);
        
        if ($teller['status'] !== 'active') {
            throw new Exception('Teller account is not active.');
        }
        
        // Get account details including status
        $account_sql = "SELECT account_id, user_id, account_number, balance, status 
                       FROM account 
                       WHERE account_number = ?";
        $account_stmt = mysqli_prepare($conn, $account_sql);
        mysqli_stmt_bind_param($account_stmt, "s", $account_number);
        mysqli_stmt_execute($account_stmt);
        $account_result = mysqli_stmt_get_result($account_stmt);
        
        if (mysqli_num_rows($account_result) !== 1) {
            throw new Exception('Account not found.');
        }
        
        $account = mysqli_fetch_assoc($account_result);

        // Check if account is closed
        if ($account['status'] !== 'closed') {
            throw new Exception('Only closed accounts can be reopened. Current status: ' . $account['status']);
        }
        
        // Update account status to active
        $update_sql = "UPDATE account SET status = 'active' WHERE account_id = ? AND status = 'closed'";
        $update_stmt = mysqli_prepare($conn, $update_sql);
        mysqli_stmt_bind_param($update_stmt, "i", $account['account_id']);
        
        if (!mysqli_stmt_execute($update_stmt)) {
            throw new Exception('Failed to reopen account');
        }

        if (mysqli_affected_rows($conn) !== 1) {
            throw new Exception('Failed to reopen account. Account status may have changed.');
        }
        
        // Record status change in transaction table
        $transaction_sql = "INSERT INTO transaction (
            receiver_account_id,
            transaction_type,
            status,
            created_at,
            completed_at,
            description,
            amount,
            teller_id
        ) VALUES (?, 'deposit', 'completed', NOW(), NOW(), ?, 0.00, ?)";
        
        $transaction_stmt = mysqli_prepare($conn, $transaction_sql);
        mysqli_stmt_bind_param($transaction_stmt, "isi", 
            $account['account_id'],
            $reason,
            $teller['teller_id']
        );
        
        if (!mysqli_stmt_execute($transaction_stmt)) {
            throw new Exception('Failed to record account reopening');
        }
        
        $transaction_id = mysqli_insert_id($conn);
        
        // Commit transaction
        mysqli_commit($conn);
        
        // Success response
        echo json_encode([
            'success' => true,
            'message' => 'Account reopened successfully',
            'data' => [
                'transaction_id' => $transaction_id,
                'account_number' => $account_number,
                'status' => 'active',
                'reopen_date' => date('Y-m-d H:i:s'),
                'teller_number' => $teller_number,
                'reason' => $reason
            ]
        ]);

    } catch (Exception $e) {
        // Rollback on error
        mysqli_rollback($conn);
        throw $e;
    }

} catch (Exception $e) {
    error_log("Account reopen error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    // Clean up statements
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    if (isset($account_stmt)) mysqli_stmt_close($account_stmt);
    if (isset($update_stmt)) mysqli_stmt_close($update_stmt);
    if (isset($transaction_stmt)) mysqli_stmt_close($transaction_stmt);
    
    // Restore autocommit and close connection
    if (isset($conn)) {
        mysqli_autocommit($conn, true);
        mysqli_close($conn);
    }
}
?> 
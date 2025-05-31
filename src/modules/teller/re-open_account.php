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
require_once '../../config/db_config.php';

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
    $conn = getDBConnection();

    // Get input
    $data = json_decode(file_get_contents('php://input'), true);
    $account_number = isset($data['account_number']) ? trim($data['account_number']) : '';
    $teller_number = isset($data['teller_number']) ? trim($data['teller_number']) : '';
    $initial_deposit = isset($data['initial_deposit']) ? floatval($data['initial_deposit']) : 0.00;

    // Validate input
    if (empty($account_number) || empty($teller_number)) {
        http_response_code(400);
        echo json_encode(['error' => 'Account number and teller number are required.']);
        exit();
    }

    // Validate initial deposit
    if ($initial_deposit < 0) {
        throw new Exception('Initial deposit amount cannot be negative.');
    }

    // Start transaction
    mysqli_autocommit($conn, false);

    try {
        // Verify teller exists
        $teller_sql = "SELECT teller_id, teller_number FROM teller WHERE teller_number = ?";
        $teller_stmt = mysqli_prepare($conn, $teller_sql);
        mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
        mysqli_stmt_execute($teller_stmt);
        $teller_result = mysqli_stmt_get_result($teller_stmt);
        
        if (mysqli_num_rows($teller_result) !== 1) {
            throw new Exception('Invalid teller number.');
        }
        
        $teller = mysqli_fetch_assoc($teller_result);
        
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

        // Check if account is actually closed
        if ($account['status'] !== 'closed') {
            throw new Exception('Only closed accounts can be reopened. Current status: ' . $account['status']);
        }

        // Check for any unresolved issues
        $pending_sql = "SELECT COUNT(*) as pending_count FROM transaction 
                       WHERE (sender_account_id = ? OR receiver_account_id = ?) 
                       AND status = 'pending'";
        $pending_stmt = mysqli_prepare($conn, $pending_sql);
        mysqli_stmt_bind_param($pending_stmt, "ii", $account['account_id'], $account['account_id']);
        mysqli_stmt_execute($pending_stmt);
        $pending_result = mysqli_stmt_get_result($pending_stmt);
        $pending_count = mysqli_fetch_assoc($pending_result)['pending_count'];

        if ($pending_count > 0) {
            throw new Exception('Cannot reopen account with pending transactions.');
        }

        // Update account status to active and set initial balance
        $update_sql = "UPDATE account SET status = 'active', balance = ? WHERE account_id = ?";
        $update_stmt = mysqli_prepare($conn, $update_sql);
        mysqli_stmt_bind_param($update_stmt, "di", $initial_deposit, $account['account_id']);
        
        if (!mysqli_stmt_execute($update_stmt)) {
            throw new Exception('Failed to reopen account');
        }

        if (mysqli_affected_rows($conn) !== 1) {
            throw new Exception('Failed to reopen account. Please verify account status.');
        }

        // Record initial deposit transaction if amount > 0
        if ($initial_deposit > 0) {
            $transaction_sql = "INSERT INTO transaction (
                receiver_account_id,
                amount,
                transaction_type,
                status,
                completed_at
            ) VALUES (?, ?, 'deposit', 'completed', NOW())";
            
            $transaction_stmt = mysqli_prepare($conn, $transaction_sql);
            mysqli_stmt_bind_param($transaction_stmt, "id", 
                $account['account_id'],
                $initial_deposit
            );
            
            if (!mysqli_stmt_execute($transaction_stmt)) {
                throw new Exception('Failed to record initial deposit transaction');
            }
            
            $transaction_id = mysqli_insert_id($conn);
        }
        
        // Commit transaction
        mysqli_commit($conn);
        
        // Success response
        $response = [
            'success' => true,
            'message' => 'Account reopened successfully',
            'account_number' => $account_number,
            'new_status' => 'active',
            'balance' => number_format($initial_deposit, 2),
            'teller_number' => $teller_number,
            'reopened_at' => date('Y-m-d H:i:s')
        ];

        if ($initial_deposit > 0) {
            $response['initial_deposit'] = [
                'amount' => number_format($initial_deposit, 2),
                'transaction_id' => $transaction_id
            ];
        }

        echo json_encode($response);

    } catch (Exception $e) {
        // Rollback on error
        mysqli_rollback($conn);
        throw $e;
    }

} catch (Exception $e) {
    error_log("Reopen account error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} finally {
    // Clean up statements
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    if (isset($account_stmt)) mysqli_stmt_close($account_stmt);
    if (isset($pending_stmt)) mysqli_stmt_close($pending_stmt);
    if (isset($update_stmt)) mysqli_stmt_close($update_stmt);
    if (isset($transaction_stmt)) mysqli_stmt_close($transaction_stmt);
    
    // Restore autocommit and close connection
    if (isset($conn)) {
        mysqli_autocommit($conn, true);
        mysqli_close($conn);
    }
}
?>
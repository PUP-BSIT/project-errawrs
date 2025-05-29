<?php
header('Content-Type: application/json');
require_once '../../config/db_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$conn = getDBConnection();

// Get input
$data = json_decode(file_get_contents('php://input'), true);
$account_number = isset($data['account_number']) ? trim($data['account_number']) : '';
$amount = isset($data['amount']) ? (float)$data['amount'] : 0;
$teller_number = isset($data['teller_number']) ? (int)$data['teller_number'] : 0;
$pin = isset($data['pin']) ? $data['pin'] : '';

// Validate input
if (empty($account_number) || $amount <= 0 || empty($teller_number) || empty($pin)) {
    http_response_code(400);
    echo json_encode(['error' => 'Account number, amount, teller number, and PIN are required.']);
    exit();
}

// Validate amount format (max 2 decimal places)
if (round($amount, 2) != $amount) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid amount format.']);
    exit();
}

// Set maximum deposit limit (optional - adjust as needed)
$max_deposit = 50000.00;
if ($amount > $max_deposit) {
    http_response_code(400);
    echo json_encode(['error' => "Deposit amount exceeds maximum limit of $" . number_format($max_deposit, 2)]);
    exit();
}

// Start transaction
mysqli_autocommit($conn, false);

try {
    // Verify teller exists and is active
    $teller_sql = "SELECT teller_number, status FROM teller WHERE teller_number = ? AND status = 'active'";
    $teller_stmt = mysqli_prepare($conn, $teller_sql);
    mysqli_stmt_bind_param($teller_stmt, "i", $teller_number);
    mysqli_stmt_execute($teller_stmt);
    $teller_result = mysqli_stmt_get_result($teller_stmt);
    
    if (mysqli_num_rows($teller_result) !== 1) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or inactive teller.']);
        mysqli_rollback($conn);
        exit();
    }
    
    // Get account details and verify PIN
    $account_sql = "SELECT account_number, balance, pin_hash, status FROM account WHERE account_number = ?";
    $account_stmt = mysqli_prepare($conn, $account_sql);
    mysqli_stmt_bind_param($account_stmt, "s", $account_number);
    mysqli_stmt_execute($account_stmt);
    $account_result = mysqli_stmt_get_result($account_stmt);
    
    if (mysqli_num_rows($account_result) !== 1) {
        http_response_code(404);
        echo json_encode(['error' => 'Account not found.']);
        mysqli_rollback($conn);
        exit();
    }
    
    $account = mysqli_fetch_assoc($account_result);
    
    // Check account status
    if ($account['status'] !== 'active') {
        http_response_code(403);
        echo json_encode(['error' => 'Account is not active.']);
        mysqli_rollback($conn);
        exit();
    }
    
    // Verify PIN
    if (!password_verify($pin, $account['pin_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid PIN.']);
        mysqli_rollback($conn);
        exit();
    }
    
    // Calculate new balance
    $new_balance = $account['balance'] + $amount;
    
    // Optional: Check for maximum account balance limit
    $max_balance = 999999.99; // Adjust as needed
    if ($new_balance > $max_balance) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Deposit would exceed maximum account balance limit.',
            'current_balance' => number_format($account['balance'], 2),
            'max_balance' => number_format($max_balance, 2)
        ]);
        mysqli_rollback($conn);
        exit();
    }
    
    // Update account balance
    $update_sql = "UPDATE account SET balance = ? WHERE account_number = ?";
    $update_stmt = mysqli_prepare($conn, $update_sql);
    mysqli_stmt_bind_param($update_stmt, "ds", $new_balance, $account_number);
    
    if (!mysqli_stmt_execute($update_stmt)) {
        throw new Exception('Failed to update account balance');
    }
    
    // Insert transaction record into teller_transaction table
    $transaction_sql = "INSERT INTO teller_transaction (teller_number, account_number, transaction_type, amount, timestamp) 
                        VALUES (?, ?, 'deposit', ?, NOW())";
    $transaction_stmt = mysqli_prepare($conn, $transaction_sql);
    mysqli_stmt_bind_param($transaction_stmt, "isd", $teller_number, $account_number, $amount);
    
    if (!mysqli_stmt_execute($transaction_stmt)) {
        throw new Exception('Failed to record transaction');
    }
    
    $transaction_id = mysqli_insert_id($conn);
    
    // Commit transaction
    mysqli_commit($conn);
    
    // Success response
    $response = [
        'success' => true,
        'message' => 'Deposit successful',
        'transaction_id' => $transaction_id,
        'account_number' => $account_number,
        'deposit_amount' => number_format($amount, 2),
        'previous_balance' => number_format($account['balance'], 2),
        'new_balance' => number_format($new_balance, 2),
        'transaction_date' => date('Y-m-d H:i:s'),
        'teller_number' => $teller_number
    ];
    
    echo json_encode($response);

    } catch (Exception $e) {
    // Rollback on error
    mysqli_rollback($conn);
    error_log("Deposit error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Transaction failed. Please try again.']);
} finally {
    // Clean up statements
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    if (isset($account_stmt)) mysqli_stmt_close($account_stmt);
    if (isset($update_stmt)) mysqli_stmt_close($update_stmt);
    if (isset($transaction_stmt)) mysqli_stmt_close($transaction_stmt);
    
    // Restore autocommit and close connection
    mysqli_autocommit($conn, true);
    mysqli_close($conn);
}
?>
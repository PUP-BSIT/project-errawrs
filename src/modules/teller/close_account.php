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

// Database connection function
function getDBConnection() {
    // Read .env file manually
    $envFile = __DIR__ . '/../.env';
    if (!file_exists($envFile)) {
        die(json_encode(['error' => '.env file not found']));
    }
    
    $envVars = [];
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue; // Skip comments
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $envVars[trim($key)] = trim($value);
        }
    }
    
    // Get database configuration
    $host = $envVars['DB_HOST'] ?? 'localhost';
    $db_name = $envVars['DB_NAME'] ?? '';
    $username = $envVars['DB_USER'] ?? 'root';
    $password = $envVars['DB_PASS'] ?? '';
    
    // Create connection
    $conn = mysqli_connect($host, $username, $password, $db_name);
    if (!$conn) {
        die(json_encode(['error' => 'Connection failed: ' . mysqli_connect_error()]));
    }
    
    return $conn;
}

// Add error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$conn = getDBConnection();

// Get input
$data = json_decode(file_get_contents('php://input'), true);
$account_number = isset($data['account_number']) ? trim($data['account_number']) : '';
$teller_number = isset($data['teller_number']) ? (int)$data['teller_number'] : 0;
$pin = isset($data['pin']) ? $data['pin'] : '';

// Validate input
if (empty($account_number) || empty($teller_number) || empty($pin)) {
    http_response_code(400);
    echo json_encode(['error' => 'Account number, teller number, and PIN are required.']);
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
    
    // Check if account is already closed
    if ($account['status'] === 'closed') {
        http_response_code(400);
        echo json_encode(['error' => 'Account is already closed.']);
        mysqli_rollback($conn);
        exit();
    }
    
    // Check account status - must be active to close
    if ($account['status'] !== 'active') {
        http_response_code(403);
        echo json_encode(['error' => 'Only active accounts can be closed.']);
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
    
    // Check if balance is zero - account can only be closed if balance is zero
    if ($account['balance'] != 0.00) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Account balance must be zero to close the account.',
            'current_balance' => number_format($account['balance'], 2)
        ]);
        mysqli_rollback($conn);
        exit();
    }
    
    // Update account status to closed
    $update_sql = "UPDATE account SET status = 'closed' WHERE account_number = ?";
    $update_stmt = mysqli_prepare($conn, $update_sql);
    mysqli_stmt_bind_param($update_stmt, "s", $account_number);
    
    if (!mysqli_stmt_execute($update_stmt)) {
        throw new Exception('Failed to close account');
    }
    
    // Insert transaction record into teller_transaction table
    $transaction_sql = "INSERT INTO teller_transaction (teller_number, account_number, transaction_type, amount, timestamp) 
                        VALUES (?, ?, 'close_account', 0.00, NOW())";
    $transaction_stmt = mysqli_prepare($conn, $transaction_sql);
    mysqli_stmt_bind_param($transaction_stmt, "is", $teller_number, $account_number);
    
    if (!mysqli_stmt_execute($transaction_stmt)) {
        throw new Exception('Failed to record transaction');
    }
    
    $transaction_id = mysqli_insert_id($conn);
    
    // Commit transaction
    mysqli_commit($conn);
    
    // Success response
    $response = [
        'success' => true,
        'message' => 'Account closed successfully',
        'transaction_id' => $transaction_id,
        'account_number' => $account_number,
        'previous_status' => 'active',
        'new_status' => 'closed',
        'final_balance' => '0.00',
        'transaction_date' => date('Y-m-d H:i:s'),
        'teller_number' => $teller_number
    ];
    
    echo json_encode($response);

} catch (Exception $e) {
    // Rollback on error
    mysqli_rollback($conn);
    error_log("Close account error: " . $e->getMessage());
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
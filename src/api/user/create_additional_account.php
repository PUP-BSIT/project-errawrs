<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

// Debug session info
error_log("Session ID in create_additional_account: " . session_id());
error_log("Full SESSION data: " . print_r($_SESSION, true));

// Check if user is logged in
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit();
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);
$account_type = isset($input['account_type']) ? $input['account_type'] : null;
$verified = isset($input['verified']) ? $input['verified'] : false;

// Debug input
error_log("Create account input: " . print_r($input, true));

// Validate account_type
if (!$account_type) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Account type is required']);
    exit();
}

// Validate account_type values
if (!in_array($account_type, ['savings', 'checking', 'time_deposit', 'credit'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid account type']);
    exit();
}

// Verify that OTP has been verified if creating account
if ($verified !== true) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'OTP verification required']);
    exit();
}

// Check if OTP has been verified
if (!isset($_SESSION['otp_verified']) || $_SESSION['otp_verified'] !== true) {
    error_log("OTP verification check failed: " . (isset($_SESSION['otp_verified']) ? "Set but not true" : "Not set"));
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No verified OTP found. Please complete verification first']);
    exit();
}

try {
    $db = db_connect();
    
    // Start transaction
    $db->begin_transaction();
    
    // Get user ID from session
    $user_id = $_SESSION['auth']['id'];
    
    // Check if user already has 3 accounts
    $checkStmt = $db->prepare('SELECT COUNT(*) as account_count FROM account WHERE user_id = ? AND status = "active"');
    $checkStmt->bind_param('i', $user_id);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['account_count'] >= 3) {
        throw new Exception('Maximum number of accounts (3) reached');
    }
    
    // Get the next account sequence number
    $seqResult = $db->query('SELECT MAX(CAST(SUBSTRING(account_number, 9) AS UNSIGNED)) as last_seq FROM account');
    $seqRow = $seqResult->fetch_assoc();
    $nextSeq = ($seqRow['last_seq'] ?? 0) + 1;
    
    // Generate account number (544YY0######)
    $year = date('y');
    $accountNumber = sprintf('544%s0%06d', $year, $nextSeq);
    
    // Create new account with account_type
    $accountStmt = $db->prepare('INSERT INTO account (user_id, account_number, balance, status, account_type) VALUES (?, ?, 0.00, "active", ?)');
    $accountStmt->bind_param('iss', $user_id, $accountNumber, $account_type);
    
    if (!$accountStmt->execute()) {
        throw new Exception('Failed to create new account');
    }
    
    $account_id = $accountStmt->insert_id;
    
    // Get all user's accounts
    $allAccountsStmt = $db->prepare('SELECT account_id, account_number, balance, status, account_type FROM account WHERE user_id = ? AND status = "active"');
    $allAccountsStmt->bind_param('i', $user_id);
    $allAccountsStmt->execute();
    $allAccountsResult = $allAccountsStmt->get_result();
    
    $accounts = [];
    while ($account = $allAccountsResult->fetch_assoc()) {
        $accounts[] = $account;
    }
    
    // Update session with new account information
    $_SESSION['auth']['all_accounts'] = $accounts;
    
    // Commit transaction
    $db->commit();
    
    // Clear OTP verification flag
    unset($_SESSION['otp_verified']);
    
    // Return success response with new account details
    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully',
        'new_account' => [
            'account_id' => $account_id,
            'account_number' => $accountNumber,
            'balance' => '0.00',
            'status' => 'active',
            'account_type' => $account_type
        ],
        'all_accounts' => $accounts
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($db)) {
        $db->rollback();
    }
    error_log("Create account error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
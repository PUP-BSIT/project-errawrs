<?php

require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';
// require_once __DIR__ . '/../../config/mailer.php'; // Uncomment and use your mailer

$session = SessionManager::getInstance();
$session->initSession();

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

if (!isset($_SESSION['otp_verified']) || $_SESSION['otp_verified'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'OTP has not been verified.']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$account_type = $input['account_type'] ?? null;

if (!$account_type || !in_array($account_type, ['savings', 'credit'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid account type is required.']);
    exit();
}

try {
    $db = db_connect();
    $db->begin_transaction();
    
    $user_id = $_SESSION['auth']['id'];
    
    // Check account limits
    $stmt = $db->prepare('SELECT type, status FROM account WHERE user_id = ?');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $accounts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    $active_accounts = array_filter($accounts, fn($acc) => $acc['status'] === 'active');

    if (count($active_accounts) >= 3) {
        throw new Exception('You have reached the maximum number of active accounts (3).');
    }

    $savings_count = count(array_filter($active_accounts, fn($acc) => $acc['type'] === 'savings'));
    $credit_count = count(array_filter($active_accounts, fn($acc) => $acc['type'] === 'credit'));

    if ($account_type === 'savings' && $savings_count >= 2) {
        throw new Exception('You can only have a maximum of 2 savings accounts.');
    }

    if ($account_type === 'credit' && $credit_count >= 1) {
        throw new Exception('You can only have a maximum of 1 credit account.');
    }
    
    $requestStmt = $db->prepare('INSERT INTO registration_request (user_id, request_type, account_type, status, created_at) VALUES (?, "add_account", ?, "pending", NOW())');
    $requestStmt->bind_param('is', $user_id, $account_type);
    $requestStmt->execute();
    
    $db->commit();
    
    unset($_SESSION['otp_verified']);
    
    // Send email to user (replace with your mailer)
    $user_name = $_SESSION['auth']['first_name'] ?? 'Valued Customer';
    $user_email = $_SESSION['auth']['email'] ?? '';
    $subject = "Stack Overcash: New Account Request Submitted";
    $body = "Hello $user_name,\n\nYour request to open a new $account_type account has been received and is pending teller review. You will be notified by email once it is approved or denied.\n\nThank you!";
    // send_mail($user_email, $subject, $body); // Uncomment and use your mailer

    echo json_encode([
        'success' => true,
        'message' => 'Your request to open a new account has been submitted for review.'
    ]);

} catch (Exception $e) {
    $db->rollback();
    http_response_code(400); // Bad Request for business logic errors
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
// require_once __DIR__ . '/../../config/mailer.php'; // Uncomment and use your mailer

header('Content-Type: application/json');

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

// Check if OTP exists and has been verified
if (!isset($_SESSION['otp'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No verified OTP found. Please complete verification first']);
    exit();
}

try {
    $db = db_connect();
    $db->begin_transaction();
    
    $user_id = $_SESSION['auth']['id'];
    $user_email = $_SESSION['auth']['email'];
    $user_name = $_SESSION['auth']['first_name'] ?? 'User';
    
    // Check if user already has 3 accounts
    $checkStmt = $db->prepare('SELECT COUNT(*) as account_count FROM account WHERE user_id = ? AND status = "active"');
    $checkStmt->bind_param('i', $user_id);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['account_count'] >= 3) {
        throw new Exception('Maximum number of accounts (3) reached');
    }
    
    // Insert into registration_request for teller review
    $requestStmt = $db->prepare('INSERT INTO registration_request (user_id, request_type, account_type, status, created_at) VALUES (?, "add_account", ?, "pending", NOW())');
    $requestStmt->bind_param('is', $user_id, $account_type);
    $requestStmt->execute();
    
    // Commit transaction
    $db->commit();
    
    // Clear OTP session data
    unset($_SESSION['otp']);
    
    // Send email to user (replace with your mailer)
    $subject = "Stack Overcash: New Account Request Submitted";
    $body = "Hello $user_name,\n\nYour request to open a new $account_type account has been received and is pending teller review. You will be notified by email once it is approved or denied.\n\nThank you!";
    // send_mail($user_email, $subject, $body); // Uncomment and use your mailer

    echo json_encode([
        'success' => true,
        'message' => 'Your request to open a new account is under review. You will be notified by email once it is processed.'
    ]);

} catch (Exception $e) {
    if (isset($db)) {
        $db->rollback();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
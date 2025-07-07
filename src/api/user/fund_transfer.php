<?php
// Prevent PHP from displaying errors as HTML
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Start session and set JSON content type
session_start();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

// Custom error handler to ensure we always return JSON
function handleError($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $errstr,
        'debug' => [
            'file' => basename($errfile),
            'line' => $errline
        ]
    ]);
    exit();
}
set_error_handler('handleError');

// Check if user is logged in for all requests
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

$debug = false;
if ((isset($input['debug']) && $input['debug']) || (isset($_GET['debug']) && $_GET['debug'])) {
    $debug = true;
}
$debug_log = [];

// EXECUTION LOGIC: This runs AFTER OTP verification
if (isset($_SESSION['otp_verified']) && $_SESSION['otp_verified'] === true) {
    if (!isset($_SESSION['pending_transfer'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No pending transfer found in session.']);
    exit();
}

    try {
        $transfer = $_SESSION['pending_transfer'];
        $db = db_connect();
        $db->begin_transaction();
        error_log('DB transaction started');

        // Re-verify source account and balance
        $stmt = $db->prepare("SELECT account_id, balance FROM account WHERE account_number = ? AND status = 'active'");
        if (!$stmt) throw new Exception('Prepare failed: ' . $db->error);
        $stmt->bind_param('s', $transfer['source_account_no']);
        if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
        $source = $stmt->get_result()->fetch_assoc();
        if (!$source) throw new Exception('Source account not found or inactive');
        if ($source['balance'] < $transfer['amount']) throw new Exception('Insufficient balance');
        error_log('Source account verified');

        // Re-verify recipient
        $stmt = $db->prepare("SELECT account_id FROM account WHERE account_number = ? AND status = 'active'");
        if (!$stmt) throw new Exception('Prepare failed: ' . $db->error);
        $stmt->bind_param('s', $transfer['recipient_account_no']);
        if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
        $recipient = $stmt->get_result()->fetch_assoc();
        if (!$recipient) throw new Exception('Recipient account not found or inactive');
        error_log('Recipient account verified');

        // Deduct from source
        $stmt = $db->prepare("UPDATE account SET balance = balance - ? WHERE account_id = ?");
        if (!$stmt) throw new Exception('Prepare failed: ' . $db->error);
        $stmt->bind_param('di', $transfer['amount'], $source['account_id']);
        if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
        if ($stmt->affected_rows !== 1) throw new Exception('Failed to update source account balance');
        error_log('Source account debited');

        // Credit recipient
        $stmt = $db->prepare("UPDATE account SET balance = balance + ? WHERE account_id = ?");
        if (!$stmt) throw new Exception('Prepare failed: ' . $db->error);
        $stmt->bind_param('di', $transfer['amount'], $recipient['account_id']);
        if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
        if ($stmt->affected_rows !== 1) throw new Exception('Failed to update recipient account balance');
        error_log('Recipient account credited');

        // Record transaction
        $stmt = $db->prepare("INSERT INTO transaction (transaction_type, amount, sender_account_id, receiver_account_id, status, description, created_at, completed_at) VALUES ('transfer_internal', ?, ?, ?, 'completed', ?, NOW(), NOW())");
        if (!$stmt) throw new Exception('Prepare failed: ' . $db->error);
        $description = "Transfer to account {$transfer['recipient_account_no']}";
        $stmt->bind_param('diis', $transfer['amount'], $source['account_id'], $recipient['account_id'], $description);
        if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);
        $transaction_id = $db->insert_id;
        error_log('Transaction record inserted, ID: ' . $transaction_id);

        $db->commit();
        error_log('DB transaction committed');
        unset($_SESSION['pending_transfer']);
        unset($_SESSION['otp_verified']);

        $response = [
            'success' => true,
            'message' => 'Transfer completed successfully',
            'transaction_id' => $transaction_id,
            'redirect_url' => $transfer['redirect_url']
        ];
        if ($debug) $response['debug_log'] = $debug_log;
        echo json_encode($response);

    } catch (Exception $e) {
        if (isset($db) && $db->connect_errno === 0) $db->rollback();
        error_log('Exception: ' . $e->getMessage());
        $response = ['success' => false, 'error' => $e->getMessage()];
        if ($debug) $response['debug_log'] = $debug_log;
        echo json_encode($response);
    }
    exit;
}

// INITIATION LOGIC: This runs BEFORE OTP to set up the session
try {
    $required = ['transaction_amount', 'source_account_no', 'recipient_account_no'];
    foreach ($required as $param) {
        if (empty($input[$param])) {
            throw new Exception("Missing required parameter: {$param}");
        }
    }

    $amount = floatval($input['transaction_amount']);
    $sourceAccountNo = strval($input['source_account_no']);
    $recipientAccountNo = strval($input['recipient_account_no']);
    $redirectUrl = isset($input['redirect_url']) ? $input['redirect_url'] : '';

    if ($amount <= 0) throw new Exception("Transfer amount must be greater than zero");

    $db = db_connect();
    $userId = $_SESSION['auth']['id'];

    // Validate source account
    $stmt = $db->prepare('SELECT account_id, balance, user_id FROM account WHERE account_number = ? AND user_id = ? AND status = "active"');
    $stmt->bind_param('si', $sourceAccountNo, $userId);
    $stmt->execute();
    $source = $stmt->get_result()->fetch_assoc();
    if (!$source) throw new Exception('Invalid source account or you do not own this account');
    if ($source['balance'] < $amount) throw new Exception('Insufficient balance');

    // Validate recipient account
    $stmt = $db->prepare('SELECT account_id, user_id FROM account WHERE account_number = ? AND status = "active"');
    $stmt->bind_param('s', $recipientAccountNo);
    $stmt->execute();
    $recipient = $stmt->get_result()->fetch_assoc();
    if (!$recipient) throw new Exception('Invalid recipient account');
    if ($source['account_id'] === $recipient['account_id']) throw new Exception('Cannot transfer to the same account');
    
    // Store transfer details in session for OTP verification
    $_SESSION['pending_transfer'] = [
        'amount' => $amount,
        'source_account_no' => $sourceAccountNo,
        'recipient_account_no' => $recipientAccountNo,
        'redirect_url' => $redirectUrl,
        'created_at' => time()
    ];
    
    echo json_encode([
        'success' => true,
        'message' => 'Transfer details saved. Please proceed with OTP verification.',
        'requires_verification' => true
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>

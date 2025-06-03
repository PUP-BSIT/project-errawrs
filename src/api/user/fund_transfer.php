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

// Check if user is logged in
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

// Get input data first
$input = json_decode(file_get_contents('php://input'), true);

// For debugging/testing only
define('DEBUG', true);
if (DEBUG) {
    error_log('Session data: ' . print_r($_SESSION, true));
    error_log('Input data: ' . print_r($input, true));
}

// Define TEST_MODE (set to false by default)
define('TEST_MODE', false);

if (defined('TEST_MODE') && TEST_MODE) {
    // Simulate a request with test data
    $input = [
        'transaction_amount' => 100,
        'source_account_no' => '544250000001',
        'recipient_account_no' => '544250000002',
        'redirect_url' => 'http://localhost/project-errawrs/public/user/transfer_success.html'
    ];
}

// Validate required parameters
$required = [
    'transaction_amount', 
    'source_account_no', 
    'recipient_account_no'
];

foreach ($required as $param) {
    if (empty($input[$param])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => "Missing required parameter: {$param}"
        ]);
        exit();
    }
}

$amount = floatval($input['transaction_amount']);
$sourceAccountNo = strval($input['source_account_no']);
$recipientAccountNo = strval($input['recipient_account_no']);
$redirectUrl = isset($input['redirect_url']) ? $input['redirect_url'] : '';

// Validate amount is positive
if ($amount <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => "Transfer amount must be greater than zero"
    ]);
    exit();
}

try {
    $db = db_connect();
    $userId = $_SESSION['auth']['id'];

    // Validate source account belongs to logged-in user
    $stmt = $db->prepare(
        'SELECT account_id, balance, user_id, account_type 
        FROM account 
        WHERE account_number = ? AND user_id = ? AND status = "active"'
    );
    $stmt->bind_param('si', $sourceAccountNo, $userId);
    $stmt->execute();
    $source = $stmt->get_result()->fetch_assoc();

    if (!$source) {
        throw new Exception('Invalid source account or you do not own this account');
    }

    // Validate source account is a savings account
    if ($source['account_type'] !== 'savings') {
        throw new Exception('Transfers from non-savings accounts are not allowed');
    }

    // Check sufficient balance
    if ($source['balance'] < $amount) {
        throw new Exception('Insufficient balance');
    }

    // Validate recipient account exists and is active
    $stmt = $db->prepare(
        'SELECT account_id, user_id, balance, account_type 
        FROM account 
        WHERE account_number = ? AND status = "active"'
    );
    $stmt->bind_param('s', $recipientAccountNo);
    $stmt->execute();
    $recipient = $stmt->get_result()->fetch_assoc();

    if (!$recipient) {
        throw new Exception('Invalid recipient account');
    }

    // Validate not transferring to self
    if ($source['account_id'] === $recipient['account_id']) {
        throw new Exception('Cannot transfer to the same account');
    }
    
    // Store transfer details in session for OTP verification
    $_SESSION['pending_transfer'] = [
        'amount' => $amount,
        'source_account_number' => $sourceAccountNo,
        'sender_account_id' => $source['account_id'],
        'recipient_account_number' => $recipientAccountNo,
        'receiver_account_id' => $recipient['account_id'],
        'redirect_url' => $redirectUrl,
        'created_at' => time()
    ];
    
    // Generate static OTP for development (in production, would send via SMS)
    $otp = '123456';
    
    // Store OTP in session
    $_SESSION['otp'] = [
        'code' => $otp,
        'created_at' => time(),
        'attempts' => 0,
        'purpose' => 'fund_transfer'
    ];
    
    // Return success with OTP info (in production, would not include the OTP in response)
    echo json_encode([
        'success' => true,
        'message' => 'Please verify the transfer with OTP',
        'requires_verification' => true,
        'transfer_details' => [
            'amount' => $amount,
            'source_account' => $sourceAccountNo,
            'recipient_account' => $recipientAccountNo,
            'redirect_url' => $redirectUrl
        ],
        'dev_otp' => $otp // Remove in production
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}

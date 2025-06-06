<?php

// Explicitly turn on output buffering and clean it
ob_start();
ob_clean();

// Prevent PHP from displaying errors as HTML
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Start session and set JSON content type
session_start();
require_once __DIR__ . '/../../config/database.php';

// Ensure output buffer is clean after includes
ob_clean();

// Set headers to prevent caching and ensure proper JSON encoding
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Custom error handler to ensure we always return JSON
function handleError($errno, $errstr, $errfile, $errline) {
    // Clear any previous output buffer before sending error response
    if (ob_get_level()) ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'fund_transfer_success' => false,
        'error' => 'Server error: ' . $errstr,
        'debug' => [
            'file' => basename($errfile),
            'line' => $errline
        ]
    ]);
    exit();
}
set_error_handler('handleError');

// For debugging/testing only
define('DEBUG', true);

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'fund_transfer_success' => false, 
        'error' => 'Method not allowed',
        'message' => 'This API only accepts POST requests'
    ]);
    exit();
}

// Get input data based on Content-Type
$input = [];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

if (strpos($contentType, 'application/json') !== false) {
    // Handle JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'fund_transfer_success' => false, 
            'error' => 'Invalid JSON input',
            'message' => json_last_error_msg()
        ]);
        exit();
    }
} elseif (strpos($contentType, 'application/x-www-form-urlencoded') !== false || strpos($contentType, 'multipart/form-data') !== false) {
    // Handle form-urlencoded or form-data input
    $input = $_POST;
} else {
    // Unsupported content type
    http_response_code(415);
    echo json_encode([
        'fund_transfer_success' => false, 
        'error' => 'Unsupported Media Type',
        'message' => 'This API supports application/json, application/x-www-form-urlencoded, and multipart/form-data'
    ]);
    exit();
}

if (DEBUG) {
    error_log('Session data: ' . print_r($_SESSION, true));
    error_log('Input data: ' . print_r($input, true));
}

// Check if user is logged in - TEMPORARILY DISABLED FOR TESTING
/*
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode([
        'fund_transfer_success' => false, 
        'error' => 'Unauthorized access', 
        'message' => 'You must be logged in as a user to use this API'
    ]);
    exit();
}
*/

// Validate required parameters
$required = [
    'transaction_amount', 
    'source_account_no', 
    'source_bank_code',
    'recipient_account_no'
];

$missing = [];
foreach ($required as $param) {
    if (empty($input[$param])) {
        $missing[] = $param;
    }
}

if (!empty($missing)) {
    http_response_code(400);
    echo json_encode([
        'fund_transfer_success' => false, 
        'error' => 'Missing required parameters',
        'missing_parameters' => $missing
    ]);
    exit();
}

$amount = floatval($input['transaction_amount']);
$sourceAccountNo = strval($input['source_account_no']);
$sourceBankCode = strval($input['source_bank_code']);
$recipientAccountNo = strval($input['recipient_account_no']);

// Validate amount is positive
if ($amount <= 0) {
    http_response_code(400);
    echo json_encode([
        'fund_transfer_success' => false, 
        'error' => 'Invalid amount',
        'message' => 'Transfer amount must be greater than zero'
    ]);
    exit();
}

try {
    $db = db_connect();
    
    // TEMPORARY FOR TESTING - Skip user validation
    // $userId = $_SESSION['auth']['id'];
    $userId = null;

    // Validate recipient account exists (temporarily remove user check for testing)
    $stmt = $db->prepare(
        'SELECT account_id, balance, user_id, account_type 
        FROM account 
        WHERE account_number = ? AND status = "active"'
    );
    $stmt->bind_param('s', $recipientAccountNo);
    $stmt->execute();
    $recipient = $stmt->get_result()->fetch_assoc();

    if (!$recipient) {
        throw new Exception('Invalid recipient account');
    }
    
    // Store user ID for future use when auth is re-enabled
    $userId = $recipient['user_id'];

    // Start transaction
    $db->begin_transaction();

    // Update recipient account balance
    $stmt = $db->prepare('UPDATE account SET balance = balance + ? WHERE account_id = ?');
    $stmt->bind_param('di', $amount, $recipient['account_id']);
    $stmt->execute();
    
    if ($stmt->affected_rows !== 1) {
        $db->rollback();
        throw new Exception('Failed to update recipient account balance');
    }
    
    // Create transaction record
    $stmt = $db->prepare(
        'INSERT INTO transaction (
            transaction_type, 
            amount, 
            sender_account_id,
            external_account_number,
            external_bank_code,
            receiver_account_id,
            status,
            description
        ) VALUES (?, ?, NULL, ?, ?, ?, "completed", ?)'
    );
    
    $transactionType = "transfer_external_in";
    $description = "External transfer from account {$sourceAccountNo} ({$sourceBankCode})";
    
    $stmt->bind_param(
        'sdssis',
        $transactionType, 
        $amount, 
        $sourceAccountNo,
        $sourceBankCode,
        $recipient['account_id'],
        $description
    );
    
    $stmt->execute();
    
    if ($stmt->affected_rows !== 1) {
        $db->rollback();
        throw new Exception('Failed to create transaction record');
    }
    
    $transactionId = $db->insert_id;
    
    // Commit transaction
    $db->commit();
    
    // Return success response
    echo json_encode([
        'fund_transfer_success' => true,
        'transaction_id' => $transactionId,
        'message' => 'External transfer received successfully'
    ]);

} catch (Exception $e) {
    // Rollback transaction if started
    if (isset($db) && $db->connect_errno === 0) {
        $db->rollback();
    }
    
    // Clear any previous output buffer before sending error response
    if (ob_get_level()) ob_end_clean();
    http_response_code(400);
    echo json_encode([
        'fund_transfer_success' => false, 
        'error' => $e->getMessage(),
        'message' => 'Failed to process external transfer'
    ]);
}

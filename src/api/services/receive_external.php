<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
    
    // Log the error
    error_log("Error [$errno] $errstr in $errfile on line $errline");
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $errstr,
        'debug' => [
            'file' => basename($errfile),
            'line' => $errline,
            'type' => $errno
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
        'success' => false, 
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
    $rawInput = file_get_contents('php://input');
    error_log('Raw input: ' . $rawInput);
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
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
        'success' => false, 
        'error' => 'Unsupported Media Type',
        'message' => 'This API supports application/json, application/x-www-form-urlencoded, and multipart/form-data'
    ]);
    exit();
}

if (DEBUG) {
    error_log('Session data: ' . print_r($_SESSION, true));
    error_log('Input data: ' . print_r($input, true));
}

// Validate required parameters according to API documentation
$required = [
    'transaction_amount', // number: The amount to be transferred
    'source_account_no',  // number: The source(external) account number
    'source_bank_code',   // string: The bank code for the source(external) account
    'recipient_account_no' // number: The recipient(internal) account number
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
        'success' => false, 
        'error' => 'Missing required parameters',
        'missing_parameters' => $missing
    ]);
    exit();
}

// Validate parameter types
if (!is_numeric($input['transaction_amount'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid parameter type',
        'message' => 'transaction_amount must be a number'
    ]);
    exit();
}

if (!is_numeric($input['source_account_no'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid parameter type',
        'message' => 'source_account_no must be a number'
    ]);
    exit();
}

if (!is_string($input['source_bank_code'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid parameter type',
        'message' => 'source_bank_code must be a string'
    ]);
    exit();
}

if (!is_numeric($input['recipient_account_no'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid parameter type',
        'message' => 'recipient_account_no must be a number'
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
        'success' => false, 
        'error' => 'Invalid amount',
        'message' => 'Transfer amount must be greater than zero'
    ]);
    exit();
}

try {
    // Test database connection
    $db = db_connect();
    if (!$db) {
        throw new Exception('Failed to connect to database');
    }
    
    error_log('Database connection successful');
    
    // Validate recipient account exists
    $stmt = $db->prepare(
        'SELECT account_id, balance, user_id, account_type 
        FROM account 
        WHERE account_number = ? AND status = "active"'
    );
    
    if (!$stmt) {
        throw new Exception('Failed to prepare statement: ' . $db->error);
    }
    
    $stmt->bind_param('s', $recipientAccountNo);
    $stmt->execute();
    $recipient = $stmt->get_result()->fetch_assoc();

    if (!$recipient) {
        throw new Exception('Invalid recipient account');
    }
    
    error_log('Recipient account found: ' . print_r($recipient, true));
    
    // Start transaction
    $db->begin_transaction();

    // Update recipient account balance
    $stmt = $db->prepare('UPDATE account SET balance = balance + ? WHERE account_id = ?');
    if (!$stmt) {
        throw new Exception('Failed to prepare update statement: ' . $db->error);
    }
    
    $stmt->bind_param('di', $amount, $recipient['account_id']);
    $stmt->execute();
    
    if ($stmt->affected_rows !== 1) {
        $db->rollback();
        throw new Exception('Failed to update recipient account balance');
    }
    
    error_log('Recipient account balance updated successfully');
    
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
    
    if (!$stmt) {
        throw new Exception('Failed to prepare insert statement: ' . $db->error);
    }
    
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
    
    error_log('Transaction completed successfully. ID: ' . $transactionId);
    
    // Return success response according to API documentation
    echo json_encode([
        'success' => true,
        'transaction_id' => $transactionId,
        'message' => 'External transfer received successfully'
    ]);

} catch (Exception $e) {
    // Log the error
    error_log('Error in receive_external.php: ' . $e->getMessage());
    
    // Rollback transaction if started
    if (isset($db) && $db->connect_errno === 0) {
        $db->rollback();
    }
    
    // Clear any previous output buffer before sending error response
    if (ob_get_level()) ob_end_clean();
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage(),
        'message' => 'Failed to process external transfer'
    ]);
} 
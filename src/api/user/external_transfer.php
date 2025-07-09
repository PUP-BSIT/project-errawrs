<?php
// Prevent PHP from displaying errors as HTML
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Start session and set JSON content type
require_once __DIR__ . '/../../config/SessionManager.php';
SessionManager::getInstance()->initSession();
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

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed',
        'message' => 'Only POST requests are allowed'
    ]);
    exit;
}

// Get JSON input
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// For debugging/testing only
define('DEBUG', true);
if (DEBUG) {
    error_log('Session data: ' . print_r($_SESSION, true));
    error_log('Input data: ' . print_r($data, true));
}

// Check if this is a transfer processing request (after OTP verification)
if (isset($_SESSION['external_transfer']) && isset($_SESSION['otp_verified']) && $_SESSION['otp_verified'] === true) {
    try {
        $transfer = $_SESSION['external_transfer'];
        $db = db_connect();
        
        // Start transaction
        $db->begin_transaction();

        // Check if source account still has sufficient balance
        $stmt = $db->prepare("
            SELECT account_id, balance 
            FROM account 
            WHERE account_number = ? AND status = 'active'
        ");
        $stmt->bind_param('s', $transfer['source_account_no']);
        $stmt->execute();
        $source = $stmt->get_result()->fetch_assoc();

        if (!$source) {
            throw new Exception('Source account not found or inactive');
        }

        if ($source['balance'] < $transfer['transaction_amount']) {
            throw new Exception('Insufficient balance');
        }

        // Deduct amount from source account
        $stmt = $db->prepare("
            UPDATE account 
            SET balance = balance - ? 
            WHERE account_id = ? AND status = 'active'
        ");
        $stmt->bind_param('di', $transfer['transaction_amount'], $source['account_id']);
        $stmt->execute();

        if ($stmt->affected_rows !== 1) {
            throw new Exception('Failed to update source account balance');
        }

        // Record the transaction (use correct ENUM value and columns)
        $stmt = $db->prepare("INSERT INTO transaction (transaction_type, amount, sender_account_id, receiver_account_id, external_bank_code, external_account_number, status, description, created_at, completed_at) VALUES ('transfer_external_out', ?, ?, NULL, ?, ?, 'completed', ?, NOW(), NOW())");
        $description = "External transfer to {$transfer['recipient_bank_code']} account {$transfer['recipient_account_no']}";
        $stmt->bind_param('disss', $transfer['transaction_amount'], $source['account_id'], $transfer['recipient_bank_code'], $transfer['recipient_account_no'], $description);
        $stmt->execute();
        if ($stmt->affected_rows !== 1) throw new Exception('Failed to create transaction record');

        $transaction_id = $db->insert_id; // Get the auto-incremented ID

        // Get external bank API URL from environment variables
        $external_api_url = getExternalBankApiUrl($transfer['recipient_bank_code']);
        // Prepare payload
        $external_payload = [
            'transaction_amount' => $transfer['transaction_amount'],
            'source_account_no' => $transfer['source_account_no'],
            'source_bank_code' => 'StackOverCash',
            'recipient_account_no' => $transfer['recipient_account_no']
        ];
        // Debug logs
        error_log('External API URL: ' . $external_api_url);
        error_log('External API Payload: ' . json_encode($external_payload));
        // Call external bank's API
        $ch = curl_init($external_api_url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($external_payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        // Add timeout settings
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        // Enable SSL verification but allow self-signed certificates
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        $curl_errno = curl_errno($ch);
        
        error_log('External API URL: ' . $external_api_url);
        error_log('External API Payload: ' . json_encode($external_payload));
        error_log('External API HTTP code: ' . $http_code);
        error_log('External API response: ' . $response);
        if ($curl_error) {
            error_log('Curl error: ' . $curl_error . ' (code: ' . $curl_errno . ')');
        }
        
        curl_close($ch);
        
        if ($curl_errno) {
            throw new Exception('Failed to connect to external bank API: ' . $curl_error);
        }
        
        if ($http_code !== 200) {
            throw new Exception('External bank API returned error code: ' . $http_code . '. Response: ' . $response);
        }

        // Commit transaction
        $db->commit();

        // Clear session data
        unset($_SESSION['external_transfer']);
        unset($_SESSION['otp_verified']);

        // Redirect to success URL
        $redirect_url = $transfer['redirect_url'] . (strpos($transfer['redirect_url'], '?') === false ? '?' : '&') . 'fund_transfer_success=true&transaction_id=' . $transaction_id;

        echo json_encode([
            'success' => true,
            'message' => 'Transfer completed successfully',
            'redirect_url' => $redirect_url
        ]);

    } catch (Exception $e) {
        // Rollback transaction if started
        if (isset($db) && $db->connect_errno === 0) {
            $db->rollback();
        }

        // Clear session data
        unset($_SESSION['external_transfer']);
        unset($_SESSION['otp_verified']);

        // Redirect to error URL
        $redirect_url = $transfer['redirect_url'] . 
            (strpos($transfer['redirect_url'], '?') === false ? '?' : '&') .
            'error_message=' . urlencode($e->getMessage());

        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'redirect_url' => $redirect_url
        ]);
    }
    exit;
}

// Initial request handling
// Validate required parameters
$required_params = [
    'transaction_amount',
    'source_account_no',
    'recipient_bank_code',
    'recipient_account_no',
    'redirect_url'
];

foreach ($required_params as $param) {
    if (!isset($data[$param]) || empty($data[$param])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required parameter',
            'message' => "Parameter '$param' is required"
        ]);
        exit;
    }
}

// Validate data types
if (!is_numeric($data['transaction_amount']) || $data['transaction_amount'] <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid amount',
        'message' => 'Transaction amount must be a positive number'
    ]);
    exit;
}

if (!is_numeric($data['source_account_no'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid source account',
        'message' => 'Source account number must be numeric'
    ]);
    exit;
}

if (!is_numeric($data['recipient_account_no'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid recipient account',
        'message' => 'Recipient account number must be numeric'
    ]);
    exit;
}

if (!filter_var($data['redirect_url'], FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid redirect URL',
        'message' => 'Redirect URL must be a valid URL'
    ]);
    exit;
}

try {
    // Get database connection
    $db = db_connect();

    // Check if source account exists and has sufficient balance
    $stmt = $db->prepare("
        SELECT a.account_id, a.balance, a.user_id, a.account_type,
               u.phone_number, u.first_name, u.last_name
        FROM account a
        JOIN user u ON a.user_id = u.user_id
        WHERE a.account_number = ? AND a.status = 'active'
    ");
    $stmt->bind_param('s', $data['source_account_no']);
    $stmt->execute();
    $source = $stmt->get_result()->fetch_assoc();

    if (!$source) {
        throw new Exception('Source account not found or inactive');
    }

    if ($source['balance'] < $data['transaction_amount']) {
        throw new Exception('Insufficient balance');
    }

    // Store transfer details in session for OTP verification
    $_SESSION['external_transfer'] = [
        'transaction_amount' => $data['transaction_amount'],
        'source_account_no' => $data['source_account_no'],
        'source_account_id' => $source['account_id'],
        'recipient_bank_code' => $data['recipient_bank_code'],
        'recipient_account_no' => $data['recipient_account_no'],
        'redirect_url' => $data['redirect_url'],
        'created_at' => time()
    ];

    // Return HTML form for OTP verification
    echo json_encode([
        'success' => true,
        'message' => 'Please verify the transfer with OTP',
        'data' => [
            'phone_number' => $source['phone_number'],
            'name' => $source['first_name'] . ' ' . $source['last_name']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// Helper function to get external bank API URL from environment variables
function getExternalBankApiUrl($bank_code) {
    // Debug all environment variables
    error_log('All environment variables: ' . print_r($_ENV, true));
    error_log('All server variables: ' . print_r($_SERVER, true));
    
    $bank_apis = [
        'Blinders' => getenv('BLINDVAULT_API'),
        'Dragon' => getenv('DRAGONVAULT_API')
    ];

    // Debug log the environment variables
    error_log('BLINDVAULT_API from getenv(): ' . getenv('BLINDVAULT_API'));
    error_log('BLINDVAULT_API from $_ENV: ' . (isset($_ENV['BLINDVAULT_API']) ? $_ENV['BLINDVAULT_API'] : 'not set'));
    error_log('BLINDVAULT_API from $_SERVER: ' . (isset($_SERVER['BLINDVAULT_API']) ? $_SERVER['BLINDVAULT_API'] : 'not set'));
    error_log('DRAGONVAULT_API from getenv(): ' . getenv('DRAGONVAULT_API'));
    error_log('DRAGONVAULT_API from $_ENV: ' . (isset($_ENV['DRAGONVAULT_API']) ? $_ENV['DRAGONVAULT_API'] : 'not set'));
    error_log('DRAGONVAULT_API from $_SERVER: ' . (isset($_SERVER['DRAGONVAULT_API']) ? $_SERVER['DRAGONVAULT_API'] : 'not set'));

    if (!isset($bank_apis[$bank_code])) {
        throw new Exception('Unsupported bank code: ' . $bank_code);
    }

    $api_url = $bank_apis[$bank_code];
    if (empty($api_url)) {
        throw new Exception('API URL not configured for bank code: ' . $bank_code . '. Please check your .env file configuration.');
    }

    return $api_url;
}
?> 
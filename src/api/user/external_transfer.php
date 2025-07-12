<?php
require_once __DIR__ . '/../../config/SessionManager.php';
SessionManager::getInstance()->initSession();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

define('DEBUG', true);
define('CURL_TIMEOUT', 30);
define('CURL_CONNECT_TIMEOUT', 10);

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

function validateUserAuthentication() {
    if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
        exit();
    }
}

function validateHttpMethod() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed',
            'message' => 'Only POST requests are allowed'
        ]);
        exit;
    }
}

function validateRequiredParameters($data) {
    $requiredParams = [
        'transaction_amount',
        'source_account_no',
        'recipient_bank_code',
        'recipient_account_no',
        'redirect_url'
    ];

    foreach ($requiredParams as $param) {
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
}

function validateDataTypes($data) {
    if (!is_numeric($data['transaction_amount']) || 
        $data['transaction_amount'] <= 0) {
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
}

function getSourceAccountInfo($db, $accountNumber) {
    $accountQuery = $db->prepare("
        SELECT a.account_id, a.balance, a.user_id, a.account_type,
               u.phone_number, u.first_name, u.last_name
        FROM account a
        JOIN user u ON a.user_id = u.user_id
        WHERE a.account_number = ? AND a.status = 'active'
    ");
    $accountQuery->bind_param('s', $accountNumber);
    $accountQuery->execute();
    return $accountQuery->get_result()->fetch_assoc();
}

function validateSourceAccount($sourceAccount, $amount) {
    if (!$sourceAccount) {
        throw new Exception('Source account not found or inactive');
    }

    if ($sourceAccount['balance'] < $amount) {
        throw new Exception('Insufficient balance');
    }
}

function getExternalBankApiUrl($bankCode) {
    if (DEBUG) {
        error_log('All environment variables: ' . print_r($_ENV, true));
        error_log('All server variables: ' . print_r($_SERVER, true));
    }
    
    $bankApis = [
        'Blinders' => getenv('BLINDVAULT_API'),
        'Dragon' => getenv('DRAGONVAULT_API')
    ];

    if (DEBUG) {
        error_log('BLINDVAULT_API from getenv(): ' . getenv('BLINDVAULT_API'));
        error_log('DRAGONVAULT_API from getenv(): ' . getenv('DRAGONVAULT_API'));
    }

    if (!isset($bankApis[$bankCode])) {
        throw new Exception('Unsupported bank code: ' . $bankCode);
    }

    $apiUrl = $bankApis[$bankCode];
    if (empty($apiUrl)) {
        throw new Exception(
            'API URL not configured for bank code: ' . $bankCode . 
            '. Please check your .env file configuration.'
        );
    }

    return $apiUrl;
}

function callExternalBankApi($apiUrl, $payload) {
    if (DEBUG) {
        error_log('External API URL: ' . $apiUrl);
        error_log('External API Payload: ' . json_encode($payload));
    }

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => 1,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => CURL_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => CURL_CONNECT_TIMEOUT,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    
    if (DEBUG) {
        error_log('External API HTTP code: ' . $httpCode);
        error_log('External API response: ' . $response);
        if ($curlError) {
            error_log('Curl error: ' . $curlError . ' (code: ' . $curlErrno . ')');
        }
    }
    
    curl_close($ch);
    
    if ($curlErrno) {
        throw new Exception('Failed to connect to external bank API: ' . $curlError);
    }
    
    if ($httpCode !== 200) {
        throw new Exception(
            'External bank API returned error code: ' . $httpCode . 
            '. Response: ' . $response
        );
    }
}

function processExternalTransfer($db, $transfer) {
    $db->begin_transaction();

    try {
        $balanceCheckQuery = $db->prepare("
            SELECT account_id, balance 
            FROM account 
            WHERE account_number = ? AND status = 'active'
        ");
        $balanceCheckQuery->bind_param('s', $transfer['source_account_no']);
        $balanceCheckQuery->execute();
        $sourceAccount = $balanceCheckQuery->get_result()->fetch_assoc();

        validateSourceAccount($sourceAccount, $transfer['transaction_amount']);

        $balanceUpdateQuery = $db->prepare("
            UPDATE account 
            SET balance = balance - ? 
            WHERE account_id = ? AND status = 'active'
        ");
        $balanceUpdateQuery->bind_param(
            'di', 
            $transfer['transaction_amount'], 
            $sourceAccount['account_id']
        );
        $balanceUpdateQuery->execute();

        if ($balanceUpdateQuery->affected_rows !== 1) {
            throw new Exception('Failed to update source account balance');
        }

        $transactionInsertQuery = $db->prepare("
            INSERT INTO transaction (
                transaction_type, amount, sender_account_id, receiver_account_id, 
                external_bank_code, external_account_number, status, description, 
                created_at, completed_at
            ) VALUES (
                'transfer_external_out', ?, ?, NULL, ?, ?, 'completed', ?, NOW(), NOW()
            )
        ");
        $description = "External transfer to {$transfer['recipient_bank_code']} " .
                      "account {$transfer['recipient_account_no']}";
        $transactionInsertQuery->bind_param('disss', 
            $transfer['transaction_amount'], 
            $sourceAccount['account_id'], 
            $transfer['recipient_bank_code'], 
            $transfer['recipient_account_no'], 
            $description
        );
        $transactionInsertQuery->execute();
        
        if ($transactionInsertQuery->affected_rows !== 1) {
            throw new Exception('Failed to create transaction record');
        }

        $transactionId = $db->insert_id;

        $externalPayload = [
            'transaction_amount' => $transfer['transaction_amount'],
            'source_account_no' => $transfer['source_account_no'],
            'source_bank_code' => 'StackOverCash',
            'recipient_account_no' => $transfer['recipient_account_no']
        ];

        $externalApiUrl = getExternalBankApiUrl($transfer['recipient_bank_code']);
        callExternalBankApi($externalApiUrl, $externalPayload);

        $db->commit();

        return $transactionId;

    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

function buildRedirectUrl($baseUrl, $params) {
    $separator = strpos($baseUrl, '?') === false ? '?' : '&';
    return $baseUrl . $separator . http_build_query($params);
}

validateUserAuthentication();
validateHttpMethod();

$jsonInput = file_get_contents('php://input');
$requestData = json_decode($jsonInput, true);

if (DEBUG) {
    error_log('Session data: ' . print_r($_SESSION, true));
    error_log('Input data: ' . print_r($requestData, true));
}

if (isset($_SESSION['external_transfer']) && 
    isset($_SESSION['otp_verified']) && 
    $_SESSION['otp_verified'] === true) {
    try {
        $transferData = $_SESSION['external_transfer'];
        $db = db_connect();
        
        $transactionId = processExternalTransfer($db, $transferData);

        unset($_SESSION['external_transfer']);
        unset($_SESSION['otp_verified']);

        $successParams = [
            'fund_transfer_success' => 'true',
            'transaction_id' => $transactionId
        ];
        $redirectUrl = buildRedirectUrl($transferData['redirect_url'], $successParams);

        echo json_encode([
            'success' => true,
            'message' => 'Transfer completed successfully',
            'redirect_url' => $redirectUrl
        ]);

    } catch (Exception $e) {
        unset($_SESSION['external_transfer']);
        unset($_SESSION['otp_verified']);

        $errorParams = ['error_message' => $e->getMessage()];
        $redirectUrl = buildRedirectUrl($transferData['redirect_url'], $errorParams);

        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'redirect_url' => $redirectUrl
        ]);
    }
    exit;
}

validateRequiredParameters($requestData);
validateDataTypes($requestData);

try {
    $db = db_connect();
    
    $sourceAccount = getSourceAccountInfo($db, $requestData['source_account_no']);
    validateSourceAccount($sourceAccount, $requestData['transaction_amount']);

    $_SESSION['external_transfer'] = [
        'transaction_amount' => $requestData['transaction_amount'],
        'source_account_no' => $requestData['source_account_no'],
        'source_account_id' => $sourceAccount['account_id'],
        'recipient_bank_code' => $requestData['recipient_bank_code'],
        'recipient_account_no' => $requestData['recipient_account_no'],
        'redirect_url' => $requestData['redirect_url'],
        'created_at' => time()
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Please verify the transfer with OTP',
        'data' => [
            'phone_number' => $sourceAccount['phone_number'],
            'name' => $sourceAccount['first_name'] . ' ' . $sourceAccount['last_name']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 
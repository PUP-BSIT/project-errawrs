<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

// Get request method and URI path
$method = $_SERVER['REQUEST_METHOD'];
$uriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathSegments = explode('/', trim($uriPath, '/'));
$endpoint = end($pathSegments);

// Check if accessing the file directly
$isDirectAccess = ($endpoint === 'fund_transfer.php');

// RESTful routing
if ($method === 'POST' && ($endpoint === 'fund-transfer' || $isDirectAccess)) {
    handleFundTransfer();
} elseif ($method === 'POST' && $endpoint === 'verify-otp') {
    handleVerifyOTP();
} elseif ($method === 'GET' && $isDirectAccess) {
    // For direct testing with GET request
    echo json_encode([
        'success' => true,
        'message' => 'Fund transfer API is working. Please use POST method for actual transfers.',
        'endpoints' => [
            'fund-transfer' => 'POST to initiate a fund transfer',
            'verify-otp' => 'POST to verify OTP and complete transfer'
        ]
    ]);
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
    exit();
}

function handleFundTransfer() {
    // Check authentication
    if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
        redirectWithError($_POST['redirect_url'] ?? '/', 'Unauthorized access');
        return;
    }

    $input = $_POST;
    $redirectUrl = $input['redirect_url'] ?? '/';

    // Validate required parameters
    $required = [
        'transaction_amount', 
        'source_account_no', 
        'recipient_account_no', 
        'redirect_url'
    ];
    
    foreach ($required as $param) {
        if (empty($input[$param])) {
            redirectWithError(
                $redirectUrl, 
                "Missing required parameter: {$param}"
            );
            return;
        }
    }

    $amount = floatval($input['transaction_amount']);
    $sourceAccountNo = strval($input['source_account_no']);
    $recipientAccountNo = strval($input['recipient_account_no']);

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
            redirectWithError(
                $redirectUrl, 
                'Invalid source account or you do not own this account'
            );
            return;
        }

        // Validate source account is a savings account
        if ($source['account_type'] !== 'savings') {
            redirectWithError(
                $redirectUrl, 
                'Transfers from credit accounts are not allowed'
            );
            return;
        }

        if ($source['balance'] < $amount) {
            redirectWithError($redirectUrl, 'Insufficient balance');
            return;
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
            redirectWithError($redirectUrl, 'Invalid recipient account');
            return;
        }
        
        // Validate recipient account is a savings account
        if ($recipient['account_type'] !== 'savings') {
            redirectWithError(
                $redirectUrl, 
                'Transfers to credit accounts are not allowed'
            );
            return;
        }

        // Store pending transfer in session for OTP verification
        $_SESSION['pending_transfer'] = [
            'amount' => $amount,
            'source_account' => $source,
            'recipient_account' => $recipient,
            'redirect_url' => $redirectUrl
        ];

        // Generate OTP (in a real system, this would send an SMS)
        $_SESSION['otp'] = sprintf("%06d", mt_rand(100000, 999999));
        
        // Return minimal HTML structure for OTP verification
        header('Content-Type: text/html');
        echo '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
</head>
<body>
    <div id="otp-verification-container">
        <h1>OTP Verification</h1>
        <p>A One-Time Password (OTP) will be sent to the source account owner.</p>
        
        <div id="send-otp-section">
            <button id="send-otp-btn">Send OTP</button>
        </div>
        
        <div id="verify-otp-section"">
            <form id="otp-form" action="verify-otp" method="post">
                <div>
                    <label for="otp">Enter 6-digit OTP:</label>
                    <input type="text" id="otp" name="otp" maxlength="6" required>
                </div>
                <button type="submit">Verify OTP</button>
            </form>
        </div>
    </div>

    <!-- Data attributes to store API information -->
    <div id="api-data" 
         data-test-otp="' . $_SESSION['otp'] . '" 
         data-verification-endpoint="verify-otp">
    </div>
    
    <!-- Frontend will add all scripts -->
</body>
</html>';
        return;

    } catch (Exception $e) {
        redirectWithError($redirectUrl, $e->getMessage());
    }
}

function handleVerifyOTP() {
    if (!isset($_SESSION['pending_transfer']) || !isset($_SESSION['otp'])) {
        redirectWithError($_POST['redirect_url'] ?? '/', 'No pending transfer found');
        return;
    }

    $inputOtp = $_POST['otp'] ?? '';
    $redirectUrl = $_SESSION['pending_transfer']['redirect_url'];

    if ($inputOtp !== $_SESSION['otp']) {
        // Invalid OTP
        redirectWithError($redirectUrl, 'Invalid OTP. Please try again.');
        return;
    }

    try {
        $db = db_connect();
        $transactionId = processTransfer($db);

        // Clear session data
        unset($_SESSION['pending_transfer']);
        unset($_SESSION['otp']);

        // Redirect to success URL
        $successUrl = $redirectUrl . 
            (parse_url($redirectUrl, PHP_URL_QUERY) ? '&' : '?') . 
            "fund_transfer_success=true&transaction_id=" . $transactionId;
        header("Location: " . $successUrl);
        return;
        
    } catch (Exception $e) {
        redirectWithError($redirectUrl, $e->getMessage());
    }
}

function processTransfer($db) {
    $transfer = $_SESSION['pending_transfer'];
    $db->begin_transaction();

    try {
        $amount = $transfer['amount'];
        $sourceId = $transfer['source_account']['account_id'];
        $recipientId = $transfer['recipient_account']['account_id'];

        // Deduct from source
        $stmt = $db->prepare(
            'UPDATE account 
            SET balance = balance - ? 
            WHERE account_id = ? AND balance >= ?'
        );
        $stmt->bind_param('dii', $amount, $sourceId, $amount);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            throw new Exception('Insufficient balance during transfer');
        }

        // Credit to recipient
        $stmt = $db->prepare(
            'UPDATE account 
            SET balance = balance + ? 
            WHERE account_id = ?'
        );
        $stmt->bind_param('di', $amount, $recipientId);
        $stmt->execute();

        // Record transaction
        $stmt = $db->prepare(
            'INSERT INTO transaction (
                sender_account_id, receiver_account_id, 
                amount, transaction_type, status, completed_at
            ) VALUES (?, ?, ?, "transfer_internal", "completed", CURRENT_TIMESTAMP)'
        );
        $stmt->bind_param('iid', $sourceId, $recipientId, $amount);
        $stmt->execute();
        
        // Get the transaction ID
        $transactionId = $db->insert_id;

        $db->commit();
        
        return $transactionId;
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

function redirectWithError($redirectUrl, $errorMessage) {
    $errorUrl = $redirectUrl . 
        (parse_url($redirectUrl, PHP_URL_QUERY) ? '&' : '?') . 
        "error_message=" . urlencode($errorMessage);
    header("Location: " . $errorUrl);
    exit();
}

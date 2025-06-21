<?php
// Prevent PHP from displaying errors directly
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

function execute_internal_transfer($transfer_data) {
    $db = db_connect();
    $db->begin_transaction();

    try {
        $userId = $_SESSION['auth']['id'];
        $amount = floatval($transfer_data['transaction_amount']);
        $sourceAccountNo = strval($transfer_data['source_account_no']);
        $recipientAccountNo = strval($transfer_data['recipient_account_no']);

        // All validations are repeated here for security
        $stmt = $db->prepare("SELECT account_id, balance FROM account WHERE account_number = ? AND user_id = ? AND status = 'active'");
        $stmt->bind_param('si', $sourceAccountNo, $userId);
        $stmt->execute();
        $source = $stmt->get_result()->fetch_assoc();
        if (!$source) throw new Exception('Invalid source account or you do not own this account');
        if ($source['balance'] < $amount) throw new Exception('Insufficient balance');

        $stmt = $db->prepare("SELECT account_id FROM account WHERE account_number = ? AND status = 'active'");
        $stmt->bind_param('s', $recipientAccountNo);
        $stmt->execute();
        $recipient = $stmt->get_result()->fetch_assoc();
        if (!$recipient) throw new Exception('Invalid recipient account');
        if ($source['account_id'] === $recipient['account_id']) throw new Exception('Cannot transfer to the same account');

        // Execute transfer
        $stmt_deduct = $db->prepare("UPDATE account SET balance = balance - ? WHERE account_id = ?");
        $stmt_deduct->bind_param('di', $amount, $source['account_id']);
        $stmt_deduct->execute();
        if ($stmt_deduct->affected_rows !== 1) throw new Exception('Failed to update source account balance');

        $stmt_credit = $db->prepare("UPDATE account SET balance = balance + ? WHERE account_id = ?");
        $stmt_credit->bind_param('di', $amount, $recipient['account_id']);
        $stmt_credit->execute();
        if ($stmt_credit->affected_rows !== 1) throw new Exception('Failed to update recipient account balance');

        $stmt_trans = $db->prepare("INSERT INTO transaction (transaction_type, amount, sender_account_id, receiver_account_id, status, description, created_at, completed_at) VALUES ('transfer_internal', ?, ?, ?, 'completed', ?, NOW(), NOW())");
        $description = "Transfer to account {$recipientAccountNo}";
        $stmt_trans->bind_param('diis', $amount, $source['account_id'], $recipient['account_id'], $description);
        $stmt_trans->execute();
        $transaction_id = $db->insert_id;

        $db->commit();
        
        return ['success' => true, 'transaction_id' => $transaction_id, 'redirect_url' => $transfer_data['redirect_url']];

    } catch (Exception $e) {
        $db->rollback();
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Main script logic
header('Content-Type: application/json');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit();
    }

    // Debug request data
    $rawInput = file_get_contents('php://input');
    error_log("Verify OTP - Raw request data: " . $rawInput);

    $input = json_decode($rawInput, true);
    if (!$input || !isset($input['otp']) || empty($input['otp'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'OTP is required']);
        exit();
    }

    error_log("Verify OTP - Input data: " . print_r($input, true));

    if (!isset($_SESSION['otp'])) {
        error_log("Verify OTP - No OTP session found. Session data: " . print_r($_SESSION, true));
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No OTP session found. Please request a new OTP.']);
        exit();
    }

    // Get OTP data from session
    $sessionOtp = $_SESSION['otp'];
    error_log("Verify OTP - Session OTP data: " . print_r($sessionOtp, true));
    error_log("Verify OTP - Comparing input OTP '" . $input['otp'] . "' with session OTP '" . $sessionOtp['code'] . "'");

    $attempts = $sessionOtp['attempts'] ?? 0;
    $maxAttempts = 3;

    // Check if too many attempts
    if ($attempts >= $maxAttempts) {
        unset($_SESSION['otp']);
        error_log("Verify OTP - Max attempts reached: " . $attempts);
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Too many attempts. Please request a new OTP.']);
        exit();
    }

    // Check if OTP has expired (5 minutes)
    $expiryTime = 300; // 5 minutes
    $timeDiff = time() - $sessionOtp['created_at'];
    error_log("Verify OTP - Time difference: " . $timeDiff . " seconds");

    if ($timeDiff > $expiryTime) {
        unset($_SESSION['otp']);
        error_log("Verify OTP - OTP expired. Created at: " . date('Y-m-d H:i:s', $sessionOtp['created_at']));
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'OTP has expired. Please request a new one.']);
        exit();
    }

    // Verify OTP
    if ($input['otp'] !== $sessionOtp['code']) {
        // Increment attempts
        $_SESSION['otp']['attempts'] = $attempts + 1;
        $remainingAttempts = $maxAttempts - ($attempts + 1);

        error_log("Verify OTP - Invalid OTP. Input: " . $input['otp'] . ", Expected: " . $sessionOtp['code']);
        error_log("Verify OTP - Attempts: " . ($attempts + 1) . ", Remaining: " . $remainingAttempts);

        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => "Invalid OTP. {$remainingAttempts} attempts remaining."
        ]);
        exit();
    }

// OTP is correct
$_SESSION['otp']['attempts'] = 0; // Reset attempts on success
$_SESSION['otp_verified'] = true; // Set the flag for other scripts to check

    // OTP is valid - clear it from session
    $verifiedPhone = $sessionOtp['phone_number'];
    unset($_SESSION['otp']);

    error_log("Verify OTP - Successful verification for phone: " . $verifiedPhone);
    error_log("Verify OTP - Final session data: " . print_r($_SESSION, true));

// OTP is correct, proceed based on purpose
$purpose = $input['purpose'] ?? null;
$transfer_payload = $input['transfer_payload'] ?? null;

if ($purpose === 'fund_transfer' || $purpose === 'external_transfer') {
    if (empty($transfer_payload)) {
        throw new Exception("Transfer payload is missing.");
    }

    // For now, we only handle internal transfer here
    if ($purpose === 'fund_transfer') {
        $result = execute_internal_transfer($transfer_payload);
        if ($result['success']) {
    echo json_encode([
        'success' => true,
                'message' => 'Transfer completed successfully', 
                'transaction_id' => $result['transaction_id'],
                'redirect_url' => $result['redirect_url']
            ]);
        } else {
            throw new Exception($result['error']);
        }
    } else {
        // Placeholder for external transfer logic
        throw new Exception("External transfer not yet implemented in this flow.");
    }
} else {
    // Handle other OTP purposes if any
    echo json_encode(['success' => true, 'message' => 'OTP verified successfully']);
}
?>
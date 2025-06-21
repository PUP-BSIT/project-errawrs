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

    if (!isset($input['phone_number']) || empty($input['phone_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Phone number is required']);
        exit();
    }

    error_log("Verify OTP - Input data: " . print_r($input, true));

    // Use SessionManager to verify OTP
    $purpose = $input['purpose'] ?? 'general';
    error_log("Verify OTP - Purpose: " . $purpose);
    error_log("Verify OTP - Session data before verification: " . print_r($_SESSION, true));
    
    $verified = $sessionManager->verifyOTP($input['otp'], $input['phone_number'], $purpose);
    error_log("Verify OTP - SessionManager verifyOTP result: " . ($verified ? 'true' : 'false'));
    
    if (!$verified) {
        // SessionManager's verifyOTP method handles all error cases and clears session data
        // We just need to return an appropriate error message
        error_log("Verify OTP - Verification failed. Session data: " . print_r($_SESSION, true));
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid OTP or OTP has expired. Please request a new OTP.']);
        exit();
    }

    error_log("Verify OTP - Successful verification for phone: " . $input['phone_number']);
    error_log("Verify OTP - Final session data: " . print_r($_SESSION, true));
    error_log("Verify OTP - otp_verified flag: " . (isset($_SESSION['otp_verified']) ? $_SESSION['otp_verified'] : 'NOT SET'));

    // Proceed based on purpose
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
        // Handle other OTP purposes (like registration and account creation)
        if ($purpose === 'create_account') {
            echo json_encode([
                'success' => true, 
                'message' => 'OTP verified successfully. You can now create your account.'
            ]);
        } elseif ($purpose === 'registration') {
            echo json_encode([
                'success' => true, 
                'message' => 'OTP verified successfully. You can now complete your registration.'
            ]);
        } else {
            echo json_encode([
                'success' => true, 
                'message' => 'OTP verified successfully'
            ]);
        }
    }
?>
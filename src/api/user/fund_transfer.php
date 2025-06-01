<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit();
}

$action = $_GET['action'] ?? 'initiate';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

switch ($action) {
    case 'initiate':
        handleInitiateTransfer();
        break;
    case 'verify_otp':
        handleVerifyOTP();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        exit();
}

function handleInitiateTransfer() {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $required = ['amount', 'source_account_no', 'recipient_account_no'];
    foreach ($required as $param) {
        if (empty($input[$param])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Missing required parameter: {$param}"]);
            exit();
        }
    }

    $amount = floatval($input['amount']);
    $source_account_no = strval($input['source_account_no']);
    $recipient_account_no = strval($input['recipient_account_no']);
    $description = $input['description'] ?? 'Internal fund transfer';

    try {
        $db = db_connect();
        $user_id = $_SESSION['auth']['id'];

        // Validate source account belongs to logged-in user
        $stmt = $db->prepare('SELECT account_id, balance, user_id FROM account WHERE account_number = ? AND user_id = ? AND status = "active"');
        $stmt->bind_param('si', $source_account_no, $user_id);
        $stmt->execute();
        $source = $stmt->get_result()->fetch_assoc();

        if (!$source) throw new Exception('Invalid source account or you do not own this account');

        if ($source['balance'] < $amount) throw new Exception('Insufficient balance');

        // Validate recipient account exists and is active
        $stmt = $db->prepare('SELECT account_id, user_id, balance FROM account WHERE account_number = ? AND status = "active"');
        $stmt->bind_param('s', $recipient_account_no);
        $stmt->execute();
        $recipient = $stmt->get_result()->fetch_assoc();

        if (!$recipient) throw new Exception('Invalid recipient account');

        // Store pending transfer in session for OTP verification if needed
        $_SESSION['pending_transfer'] = [
            'amount' => $amount,
            'source_account' => $source,
            'recipient_account' => $recipient,
            'description' => $description
        ];

        if ($source['user_id'] === $recipient['user_id']) {
            // If same user, process transfer immediately
            processTransfer($db);
            echo json_encode([
                'success' => true,
                'message' => 'Transfer successful (linked accounts)',
                'source_account_balance' => $source['balance'] - $amount,
                'recipient_account_balance' => $recipient['balance'] + $amount
            ]);
        } else {
            // Different users require OTP verification
            echo json_encode([
                'success' => true,
                'requires_otp' => true,
                'message' => 'OTP verification required. Continue on frontend.'
            ]);
        }

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function handleVerifyOTP() {
    if (!isset($_SESSION['pending_transfer'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No pending transfer found']);
        exit();
    }

    try {
        $db = db_connect();
        processTransfer($db);

        unset($_SESSION['pending_transfer']);

        echo json_encode([
            'success' => true,
            'message' => 'Transfer completed successfully'
        ]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function processTransfer($db) {
    $transfer = $_SESSION['pending_transfer'];
    $db->begin_transaction();

    try {
        $amount = $transfer['amount'];
        $source_id = $transfer['source_account']['account_id'];
        $recipient_id = $transfer['recipient_account']['account_id'];
        $description = $transfer['description'];

        // Deduct from source
        $stmt = $db->prepare('UPDATE account SET balance = balance - ? WHERE account_id = ? AND balance >= ?');
        $stmt->bind_param('dii', $amount, $source_id, $amount);
        $stmt->execute();

        if ($stmt->affected_rows === 0) throw new Exception('Insufficient balance during transfer');

        // Credit to recipient
        $stmt = $db->prepare('UPDATE account SET balance = balance + ? WHERE account_id = ?');
        $stmt->bind_param('di', $amount, $recipient_id);
        $stmt->execute();

        $stmt = $db->prepare('
            INSERT INTO transaction (
                sender_account_id, receiver_account_id, amount, transaction_type, status, description, completed_at
            ) VALUES (?, ?, ?, "transfer_internal", "completed", ?, CURRENT_TIMESTAMP)
        ');
        $stmt->bind_param('iids', $source_id, $recipient_id, $amount, $description);
        $stmt->execute();

        $db->commit();
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

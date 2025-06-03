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

$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($input['otp'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'OTP is required']);
    exit();
}

// Validate OTP format (6 digits)
if (!preg_match('/^\d{6}$/', $input['otp'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'OTP must be 6 digits']);
    exit();
}

// Check if OTP exists in session
if (!isset($_SESSION['otp'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No OTP request found. Please request a new OTP']);
    exit();
}

// Check if pending transfer exists in session
if (!isset($_SESSION['pending_transfer'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No pending transfer found. Please start the process again']);
    exit();
}

$storedOTP = $_SESSION['otp'];
$pendingTransfer = $_SESSION['pending_transfer'];

// Check if OTP is expired (10 minutes)
if (time() - $storedOTP['created_at'] > 600) {
    unset($_SESSION['otp']);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'OTP has expired. Please request a new one']);
    exit();
}

// Check if too many attempts (max 3)
if ($storedOTP['attempts'] >= 3) {
    unset($_SESSION['otp']);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Too many failed attempts. Please request a new OTP']);
    exit();
}

// Verify OTP
if ($input['otp'] !== $storedOTP['code']) {
    // Increment attempts
    $_SESSION['otp']['attempts']++;
    $remainingAttempts = 3 - $_SESSION['otp']['attempts'];
    
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => "Invalid OTP. $remainingAttempts attempts remaining"
    ]);
    exit();
}

try {
    $db = db_connect();
    
    // Start transaction
    $db->begin_transaction();
    
    // Extract transfer details from session
    $amount = $pendingTransfer['amount'];
    $sourceAccountId = $pendingTransfer['sender_account_id'];
    $recipientAccountId = $pendingTransfer['receiver_account_id'];
    $sourceAccountNo = $pendingTransfer['source_account_number'];
    $recipientAccountNo = $pendingTransfer['recipient_account_number'];
    
    // Verify source account still has sufficient balance
    $stmt = $db->prepare('SELECT balance FROM account WHERE account_id = ? AND status = "active"');
    $stmt->bind_param('i', $sourceAccountId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Source account no longer active');
    }
    
    $sourceAccount = $result->fetch_assoc();
    if ($sourceAccount['balance'] < $amount) {
        throw new Exception('Insufficient balance');
    }
    
    // Deduct from source account
    $stmt = $db->prepare(
        'UPDATE account 
        SET balance = balance - ? 
        WHERE account_id = ? AND balance >= ?'
    );
    $stmt->bind_param('dii', $amount, $sourceAccountId, $amount);
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        throw new Exception('Insufficient balance during transfer');
    }

    // Credit to recipient account
    $stmt = $db->prepare(
        'UPDATE account 
        SET balance = balance + ? 
        WHERE account_id = ?'
    );
    $stmt->bind_param('di', $amount, $recipientAccountId);
    $stmt->execute();

    // Record transaction
    $stmt = $db->prepare(
        'INSERT INTO transaction 
        (sender_account_id, receiver_account_id, amount, transaction_type, status, description) 
        VALUES (?, ?, ?, "transfer_internal", "completed", ?)'
    );
    
    $description = "Transfer from {$sourceAccountNo} to {$recipientAccountNo}";
    $stmt->bind_param('iisd', 
        $sourceAccountId, 
        $recipientAccountId, 
        $amount, 
        $description
    );
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to record transaction: ' . $stmt->error);
    }
    
    $transactionId = $stmt->insert_id;
    
    if (!$transactionId) {
        throw new Exception('Transaction was created but no ID was returned');
    }

    // Commit transaction
    $db->commit();
    
    // Get updated account balance
    $stmt = $db->prepare('SELECT balance FROM account WHERE account_id = ?');
    $stmt->bind_param('i', $sourceAccountId);
    $stmt->execute();
    $updatedSource = $stmt->get_result()->fetch_assoc();
    
    // Clear session data
    unset($_SESSION['otp']);
    
    // Get the redirect URL if it exists
    $redirectUrl = isset($pendingTransfer['redirect_url']) && !empty($pendingTransfer['redirect_url']) 
        ? $pendingTransfer['redirect_url'] 
        : '';
    
    // Prepare response data
    $responseData = [
        'success' => true,
        'message' => 'Fund transfer completed successfully',
        'transaction_id' => $transactionId,
        'transaction_date' => date('Y-m-d H:i:s'),
        'amount' => $amount,
        'source_account' => $sourceAccountNo,
        'recipient_account' => $recipientAccountNo,
        'new_balance' => $updatedSource['balance']
    ];
    
    // Store transaction data in session for redirect
    $_SESSION['transaction_data'] = $responseData;
    
    // Clear the pending transfer from session
    unset($_SESSION['pending_transfer']);
    
    // If redirect URL is provided, redirect with parameters
    if (!empty($redirectUrl)) {
        // Append transaction data to redirect URL
        $redirectParams = http_build_query([
            'fund_transfer_success' => 'true',
            'transaction_id' => $transactionId,
            'amount' => $amount,
            'source_account' => $sourceAccountNo,
            'recipient_account' => $recipientAccountNo
        ]);
        
        $redirectUrlWithParams = strpos($redirectUrl, '?') !== false 
            ? $redirectUrl . '&' . $redirectParams 
            : $redirectUrl . '?' . $redirectParams;
        
        // Return JSON with redirect information
        echo json_encode(array_merge($responseData, [
            'redirect' => true,
            'redirect_url' => $redirectUrlWithParams
        ]));
    } else {
        // Just return JSON response without redirect
        echo json_encode($responseData);
    }

} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($db) && $db->ping()) {
        $db->rollback();
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
} 
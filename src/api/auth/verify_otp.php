<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate required fields
if (!isset($data['otp']) || !isset($data['phone_number'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'OTP and phone number are required']);
    exit();
}

$otp = $data['otp'];
$phone_number = $data['phone_number'];

// Validate OTP format (6 digits)
if (!preg_match('/^\d{6}$/', $otp)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid OTP format']);
    exit();
}

// Phone number validation and conversion
$phone = $phone_number;
$phone = preg_replace('/[^0-9+]/', '', $phone);

if (preg_match('/^\+?639\d{9}$/', $phone)) {
    $phone = '0' . substr($phone, -10);
}

// Check if OTP exists in session
if (!isset($_SESSION['otp'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No OTP request found. Please request a new OTP']);
    exit();
}

$storedOTP = $_SESSION['otp'];

// Determine the purpose of this OTP verification
$isRegistration = isset($_SESSION['registration']);

// If this is for registration, check registration data
if ($isRegistration) {
    if (!isset($_SESSION['registration'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No registration data found. Please start registration process again']);
        exit();
    }
    $registration = $_SESSION['registration'];
    
    // Validate phone number matches registration data
    if ($registration['phone_number'] !== $phone) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Phone number does not match registration data']);
        exit();
    }
}

// Validate phone number matches OTP request
if ($storedOTP['phone_number'] !== $phone) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Phone number does not match OTP request']);
    exit();
}

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
if ($otp !== $storedOTP['code']) {
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

// If this is not a registration flow, just return success
if (!$isRegistration) {
    echo json_encode([
        'success' => true,
        'message' => 'OTP verified successfully'
    ]);
    exit();
}

// Below is the registration flow
try {
    $db = db_connect();
    
    // Start transaction
    $db->begin_transaction();
    
    // Check if username already exists
    $checkStmt = $db->prepare('SELECT user_id FROM user WHERE username = ?');
    $checkStmt->bind_param('s', $registration['username']);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        throw new Exception('Username is already taken');
    }
    
    // Check if phone number already exists
    $checkPhoneStmt = $db->prepare('SELECT user_id FROM user WHERE phone_number = ?');
    $checkPhoneStmt->bind_param('s', $registration['phone_number']);
    $checkPhoneStmt->execute();
    $phoneResult = $checkPhoneStmt->get_result();
    
    if ($phoneResult->num_rows > 0) {
        throw new Exception('Phone number is already registered');
    }
    
    // Insert new user
    $stmt = $db->prepare('INSERT INTO user (username, password_hash, first_name, last_name, phone_number) VALUES (?, ?, ?, ?, ?)');
    
    // Ensure password is properly hashed using PASSWORD_DEFAULT
    $password = $registration['password'];
    $password_hash = password_hash($password, PASSWORD_DEFAULT, ['cost' => 12]);
    
    if ($password_hash === false) {
        throw new Exception('Failed to hash password');
    }
    
    $stmt->bind_param('sssss', 
        $registration['username'],
        $password_hash,
        $registration['first_name'],
        $registration['last_name'],
        $registration['phone_number']
    );
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to create user account');
    }
    
    $user_id = $stmt->insert_id;

    // Get the next account sequence number
    $seqResult = $db->query('SELECT MAX(CAST(SUBSTRING(account_number, 9) AS UNSIGNED)) as last_seq FROM account');
    $seqRow = $seqResult->fetch_assoc();
    $nextSeq = ($seqRow['last_seq'] ?? 0) + 1;
    
    // Generate account number (544YY0######)
    $year = date('y');
    $accountNumber = sprintf('544%s0%06d', $year, $nextSeq);
    
    // Create account for the user
    $accountStmt = $db->prepare('INSERT INTO account (user_id, account_number, balance, status) VALUES (?, ?, 0.00, "active")');
    $accountStmt->bind_param('is', $user_id, $accountNumber);
    
    if (!$accountStmt->execute()) {
        throw new Exception('Failed to create bank account');
    }
    
    $account_id = $accountStmt->insert_id;
    
    // Commit transaction
    $db->commit();
    
    // Clear session data
    unset($_SESSION['otp']);
    unset($_SESSION['registration']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Registration completed successfully',
        'user' => [
            'user_id' => $user_id,
            'username' => $registration['username'],
            'first_name' => $registration['first_name'],
            'last_name' => $registration['last_name'],
            'phone_number' => $registration['phone_number']
        ],
        'account' => [
            'account_id' => $account_id,
            'account_number' => $accountNumber,
            'balance' => '0.00',
            'status' => 'active'
        ]
    ]);
} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($db)) {
        $db->rollback();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
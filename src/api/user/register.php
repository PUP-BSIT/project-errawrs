<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate required fields
if (!isset($data['first_name'], $data['last_name'], $data['username'], $data['password'], $data['phone_number'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit();
}

// Validate field lengths
if (strlen($data['username']) < 3 || strlen($data['username']) > 20) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Username must be between 3 and 20 characters']);
    exit();
}

if (strlen($data['password']) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']);
    exit();
}

if (strlen($data['first_name']) < 2 || strlen($data['last_name']) < 2) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Names must be at least 2 characters']);
    exit();
}

// Phone number validation and conversion
$phone = $data['phone_number'];
$phone = preg_replace('/[^0-9+]/', '', $phone);

// Convert +639 or 639 format to 09
if (preg_match('/^\+?639\d{9}$/', $phone)) {
    $phone = '0' . substr($phone, -10);
}

// Validate phone number format
if (!preg_match('/^09\d{9}$/', $phone)) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => 'Invalid phone number format. Must start with 09 and have 11 digits total'
    ]);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

try {
    $db = db_connect();
    
    // Check if username already exists
    $checkStmt = $db->prepare('SELECT user_id FROM user WHERE username = ?');
    $checkStmt->bind_param('s', $data['username']);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        throw new Exception('Username is already taken');
    }
    
    // Check if phone number already exists
    $checkPhoneStmt = $db->prepare('SELECT user_id FROM user WHERE phone_number = ?');
    $checkPhoneStmt->bind_param('s', $phone);
    $checkPhoneStmt->execute();
    $phoneResult = $checkPhoneStmt->get_result();
    
    if ($phoneResult->num_rows > 0) {
        throw new Exception('Phone number is already registered');
    }

    // Store registration data in session
    $_SESSION['registration'] = [
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'],
        'username' => $data['username'],
        'password' => $data['password'],
        'phone_number' => $phone,
        'created_at' => time()
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Registration details stored. Please proceed with OTP verification.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
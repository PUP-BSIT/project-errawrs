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

// Validate phone number is provided
if (!isset($data['phone_number'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Phone number is required']);
    exit();
}

// Phone number validation and conversion (same as register.php)
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

// Use static OTP for development (no SMS API yet)
$otp = '123456';

// Store OTP and phone number in session
$_SESSION['otp'] = [
    'code' => $otp,
    'phone_number' => $phone,
    'created_at' => time(),
    'attempts' => 0,
    'purpose' => $data['purpose'] ?? 'general'
];

// In a real application, you would send the OTP via SMS here
// For development, we'll just return success

echo json_encode([
    'success' => true,
    'message' => 'OTP sent successfully',
    'debug_otp' => $otp // Remove this in production
]); 
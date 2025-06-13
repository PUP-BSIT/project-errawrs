<?php
// Set session cookie parameters before starting session
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',  // Leave empty for localhost
    'secure' => false,  // Set to true in production
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['phone_number']) || empty($input['phone_number'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Phone number is required']);
    exit();
}

$phone_number = $input['phone_number'];
// Normalize phone number format
$phone = preg_replace('/[^0-9+]/', '', $phone_number);
if (preg_match('/^\+?639\d{9}$/', $phone)) {
    $phone = '0' . substr($phone, -10);
}

$purpose = $input['purpose'] ?? 'general';

try {
    // Static OTP for development/testing
    $otp = "123456";
    $created_at = time();

    $_SESSION['otp'] = [
        'code' => $otp,
        'phone_number' => $phone,
        'created_at' => $created_at,
        'attempts' => 0
    ];

    // Debug log
    error_log("OTP Session Data: " . print_r($_SESSION['otp'], true));
    error_log("Original phone: " . $phone_number . ", Normalized phone: " . $phone);

    error_log("OTP $otp sent to $phone_number for $purpose");

    // In development mode, include the OTP in the response
    echo json_encode([
        'success' => true, 
        'message' => 'OTP generated successfully',
        'debug' => [
            'original_phone' => $phone_number,
            'normalized_phone' => $phone,
            'session_id' => session_id(),
            'otp_code' => $otp  // For development only
        ]
    ]);
} catch (Exception $e) {
    error_log("Send OTP Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
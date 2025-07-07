<?php
// Prevent PHP from displaying errors directly
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

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

// Set session flag
$_SESSION['otp_verified'] = 1;

error_log("Verify OTP - Successful verification for phone: " . $input['phone_number']);
error_log("Verify OTP - Final session data: " . print_r($_SESSION, true));
error_log("Verify OTP - otp_verified flag: " . (isset($_SESSION['otp_verified']) ? $_SESSION['otp_verified'] : 'NOT SET'));

echo json_encode(['success' => true, 'message' => 'OTP verified successfully.']);
exit();
?>
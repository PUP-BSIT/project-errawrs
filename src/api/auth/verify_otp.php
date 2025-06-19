<?php
// Prevent PHP from displaying errors directly
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set session save path to XAMPP temp directory
$sessionPath = __DIR__ . '/../../../tmp';
if (!is_dir($sessionPath)) {
    mkdir($sessionPath, 0777, true);
}
session_save_path($sessionPath);

// Set session cookie parameters before starting session
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',  // Leave empty for localhost
    'secure' => false,  // Set to true in production
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Debug session before start
error_log("Before session_start - Session save path: " . session_save_path());
error_log("Before session_start - Session name: " . session_name());
error_log("Before session_start - Cookies: " . print_r($_COOKIE, true));

session_start();

// Debug session info
error_log("After session_start - Session ID: " . session_id());
error_log("After session_start - Session Name: " . session_name());
error_log("After session_start - Session Save Path: " . session_save_path());
error_log("After session_start - Full Session Data: " . print_r($_SESSION, true));

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

// Set JSON content type
header('Content-Type: application/json');

$sessionManager = SessionManager::getInstance();

try {
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

    // OTP is valid - clear it from session
    $verifiedPhone = $sessionOtp['phone_number'];
    unset($_SESSION['otp']);

    // Set verification success in session
    $_SESSION['otp_verified'] = true;

    error_log("Verify OTP - Successful verification for phone: " . $verifiedPhone);
    error_log("Verify OTP - Final session data: " . print_r($_SESSION, true));

    echo json_encode([
        'success' => true,
        'message' => 'OTP verified successfully',
        'phone_number' => $verifiedPhone
    ]);

} catch (Exception $e) {
    error_log("Verify OTP Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An error occurred while verifying OTP.',
        'debug_message' => $e->getMessage()
    ]);
}
?>
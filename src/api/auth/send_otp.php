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

// Set JSON content type first
header('Content-Type: application/json');

try {
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

    // Check if required files exist before requiring them
    $requiredFiles = [
        __DIR__ . '/../../config/database.php',
        __DIR__ . '/../../../vendor/autoload.php',
        __DIR__ . '/../../config/SessionManager.php'
    ];

    foreach ($requiredFiles as $file) {
        if (!file_exists($file)) {
            throw new Exception("Required file not found: " . basename($file));
        }
        require_once $file;
    }

    $sessionManager = SessionManager::getInstance();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit();
    }

    $rawInput = file_get_contents('php://input');
    if (!$rawInput) {
        throw new Exception('No input data received');
    }

    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data: ' . json_last_error_msg());
    }

    if (!isset($input['phone_number']) || empty($input['phone_number'])) {
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

    // For development, use static OTP
    $otp = "123456";  // This will be replaced with SMS integration in production
    $created_at = time();

    $_SESSION['otp'] = [
        'code' => $otp,
        'phone_number' => $phone,
        'created_at' => $created_at,
        'attempts' => 0
    ];

    // Send success response without exposing OTP
    echo json_encode([
        'success' => true, 
        'message' => 'OTP sent successfully to your phone number.'
    ]);

} catch (Exception $e) {
    error_log("Send OTP Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'An error occurred while processing your request.',
        'debug_message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
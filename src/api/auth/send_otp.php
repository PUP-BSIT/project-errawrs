<?php
use Dotenv\Dotenv;

// Prevent PHP from displaying errors directly
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set session save path to XAMPP temp directory
$sessionPath = __DIR__ . '/../../../tmp';
if (!is_dir($sessionPath)) {
    mkdir($sessionPath, 0777, true);
}
session_save_path($sessionPath);

// Debug session before start
error_log("Send OTP - Before session_start - Session save path: " . session_save_path());
error_log("Send OTP - Before session_start - Session name: " . session_name());
error_log("Send OTP - Before session_start - Cookies: " . print_r($_COOKIE, true));

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

// Debug session after start
error_log("Send OTP - After session_start - Session ID: " . session_id());
error_log("Send OTP - After session_start - Session name: " . session_name());
error_log("Send OTP - After session_start - Session data: " . print_r($_SESSION, true));

// Set JSON content type first
header('Content-Type: application/json');

try {
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

    // Debug request data
    $rawInput = file_get_contents('php://input');
    error_log("Send OTP - Raw request data: " . $rawInput);

    if (!$rawInput) {
        throw new Exception('No input data received');
    }

    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data: ' . json_last_error_msg());
    }

    error_log("Send OTP - Decoded input: " . print_r($input, true));

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

    error_log("Send OTP - Normalized phone: " . $phone);

    $purpose = $input['purpose'] ?? 'general';

    // Load environment variables
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
    $dotenv->load();

    // Format phone number for Semaphore (remove leading 0 and add country code)
    $formattedPhone = '+63' . substr($phone, 1);
    error_log("Send OTP - Formatted phone for API: " . $formattedPhone);

    // Use Semaphore's OTP endpoint
    $apiKey = $_ENV['SEMAPHORE_API_KEY'];
    $senderId = $_ENV['SEMAPHORE_SENDER_ID'];
    $apiUrl = $_ENV['SEMAPHORE_API_URL'];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'apikey' => $apiKey,
        'number' => $formattedPhone,
        'message' => 'Your OTP is {otp}. DO NOT SHARE THIS TO ANYONE.',
        'sendername' => $senderId
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    error_log("Send OTP - API Response: " . $response);
    error_log("Send OTP - API HTTP Code: " . $httpCode);

    if ($httpCode !== 200 || !$response) {
        error_log("Semaphore API Error: " . $response);
        throw new Exception('Failed to send OTP via SMS. Please try again.');
    }

    $apiResponse = json_decode($response, true);
    if (!$apiResponse || isset($apiResponse['error'])) {
        error_log("Semaphore API Error Response: " . $response);
        throw new Exception('Failed to send OTP via SMS: ' . ($apiResponse['error'] ?? 'Unknown error'));
    }

    // Get the OTP code from the API response
    $otp = $apiResponse[0]['code'] ?? null;
    if (!$otp) {
        error_log("Semaphore API Error: No OTP code in response");
        throw new Exception('Failed to generate OTP. Please try again.');
    }

    error_log("Send OTP - Generated OTP: " . $otp);

    $created_at = time();

    // Store OTP in session
    $_SESSION['otp'] = [
        'code' => (string)$otp, // Ensure OTP is stored as string
        'phone_number' => $phone,
        'created_at' => $created_at,
        'attempts' => 0
    ];

    // Debug session data after storing OTP
    error_log("Send OTP - Session data after storing OTP: " . print_r($_SESSION, true));

    // Ensure session is written
    session_write_close();
    session_start();

    // Verify session data was stored
    error_log("Send OTP - Session data after write/restart: " . print_r($_SESSION, true));

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
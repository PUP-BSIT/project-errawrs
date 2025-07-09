<?php
use Dotenv\Dotenv;

set_exception_handler(function($e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Fatal error', 'details' => $e->getMessage()]);
    exit;
});
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Fatal error', 'details' => $errstr]);
    exit;
});

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

// Set JSON content type first
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

try {
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
    // Log the full API response for debugging
    error_log("Send OTP - Full Semaphore API Response: " . print_r($response, true));

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

    // Store OTP using SessionManager
    $stored = $sessionManager->storeOTP((string)$otp, $phone, $purpose);
    
    if (!$stored) {
        throw new Exception('Failed to store OTP in session. Please try again.');
    }

    // Debug session data after storing OTP
    error_log("Send OTP - Session data after storing OTP: " . print_r($_SESSION, true));

    // Send success response without exposing OTP
    $responseArr = [
        'success' => true,
        'message' => 'OTP sent successfully to your phone number.'
    ];
    // Expose OTP in development environment for debugging
    if (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'development') {
        $responseArr['dev_otp'] = $otp;
    }
    echo json_encode($responseArr);

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
<?php
// Ensure no output before session_start
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Debug session path
error_log("Session save path: " . ini_get('session.save_path'));

// Set session cookie parameters before starting session
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',  // Leave empty for localhost
    'secure' => false,  // Set to true in production
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Start the session
session_start();

// Debug session info
error_log("Session ID in send_otp: " . session_id());
error_log("Full SESSION data before OTP generation: " . print_r($_SESSION, true));

// Include required files
require_once __DIR__ . '/../../config/database.php';
// Remove dependency on missing vendor/autoload.php
// require_once __DIR__ . '/../../../vendor/autoload.php';

// Set content type
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Parse input
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

    // Store OTP in session
    $_SESSION['otp'] = [
        'code' => $otp,
        'phone_number' => $phone,
        'created_at' => $created_at,
        'attempts' => 0
    ];

    // Debug log
    error_log("OTP Session Data: " . print_r($_SESSION['otp'], true));
    error_log("Original phone: " . $phone_number . ", Normalized phone: " . $phone);
    error_log("Session ID: " . session_id());
    error_log("OTP $otp sent to $phone_number for $purpose");
    
    // Also store OTP in database for backup
    try {
        $conn = db_connect();
        
        // Check if table exists
        $table_check = $conn->query("SHOW TABLES LIKE 'otp_codes'");
        if ($table_check->num_rows == 0) {
            error_log("otp_codes table does not exist, creating it");
            $conn->query("CREATE TABLE IF NOT EXISTS otp_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                otp_code VARCHAR(10) NOT NULL,
                created_at INT NOT NULL,
                attempts INT DEFAULT 0,
                INDEX (phone_number)
            )");
        } else {
            error_log("otp_codes table exists");
        }
        
        // Delete any existing OTPs for this phone number
        $delete_stmt = $conn->prepare("DELETE FROM otp_codes WHERE phone_number = ?");
        $delete_stmt->bind_param('s', $phone);
        $delete_stmt->execute();
        
        // Insert new OTP
        $insert_stmt = $conn->prepare("INSERT INTO otp_codes (phone_number, otp_code, created_at, attempts) VALUES (?, ?, ?, ?)");
        if (!$insert_stmt) {
            error_log("Failed to prepare insert statement: " . $conn->error);
            throw new Exception("Database error: " . $conn->error);
        }
        
        if ($insert_stmt) {
            $zero = 0;
            $insert_stmt->bind_param('ssis', $phone, $otp, $created_at, $zero);
            $insert_stmt->execute();
            error_log("OTP stored in database for phone: " . $phone);
        }
    } catch (Exception $db_error) {
        error_log("Database error while storing OTP: " . $db_error->getMessage());
        // Continue even if database storage fails
    }

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
    
    // Ensure session data is written
    session_write_close();
    
} catch (Exception $e) {
    error_log("Send OTP Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to generate OTP: ' . $e->getMessage()]);
}
?>
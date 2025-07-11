<?php
require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';

// Initialize session
$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/error.log');

// Start output buffering
ob_start();

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');  // Change this to match your domain
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Add catch-all error and exception handlers for debugging
set_exception_handler(function($e) {
    error_log('Uncaught exception: ' . $e->getMessage());
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal Server Error', 'details' => $e->getMessage()]);
    exit;
});
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("Error [$errno] $errstr in $errfile on line $errline");
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal Server Error', 'details' => $errstr]);
    exit;
});

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Debug logging
    error_log("Session check - Session data: " . print_r($_SESSION, true));
    error_log("Session check - Cookie data: " . print_r($_COOKIE, true));

    // Check if user is authenticated
    if ($sessionManager->isAuthenticated()) {
        // Update last activity
        $sessionManager->updateActivity();

        // Fetch all user fields from the database
        $conn = db_connect();
        $user_id = $_SESSION['auth']['id'];
        $stmt = $conn->prepare('SELECT user_id, username, first_name, last_name, phone_number, date_of_birth, nationality, street, city, zip_code, country, email, id_type, id_image FROM user WHERE user_id = ?');
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $stmt->bind_result($user_id, $username, $first_name, $last_name, $phone_number, $date_of_birth, $nationality, $street, $city, $zip_code, $country, $email, $id_type, $id_image);
        $stmt->fetch();
        $stmt->close();
        $conn->close();

        $userData = [
            'user_id' => $user_id,
            'username' => $username,
            'first_name' => $first_name,
            'last_name' => $last_name,
            'phone_number' => $phone_number,
            'date_of_birth' => $date_of_birth,
            'nationality' => $nationality,
            'street' => $street,
            'city' => $city,
            'zip_code' => $zip_code,
            'country' => $country,
            'email' => $email,
            'id_type' => $id_type,
            'id_image' => $id_image
        ];
        echo json_encode([
            'success' => true,
            'authenticated' => true,
            'user' => $userData
        ]);
    } else {
        error_log("Session check failed - Not authenticated");
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
            'error' => 'Session expired or invalid'
    ]);
    }

} catch (Exception $e) {
    error_log("Session check error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'error' => 'Internal server error'
    ]);
} finally {
    // Flush output buffer
    ob_end_flush();
} 
<?php
require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/Database.php';

// --- DEBUGGING: Show all errors and log to file and output ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
file_put_contents('/tmp/session_check_debug.log', "\n==== session_check.php called at " . date('c') . " ====\n", FILE_APPEND);
file_put_contents('/tmp/session_check_debug.log', "Request URI: " . $_SERVER['REQUEST_URI'] . "\n", FILE_APPEND);
file_put_contents('/tmp/session_check_debug.log', "Session ID: " . session_id() . "\n", FILE_APPEND);
file_put_contents('/tmp/session_check_debug.log', "Cookie: " . print_r($_COOKIE, true) . "\n", FILE_APPEND);

// Initialize session
$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

// Debug logging for session troubleshooting
error_log('Session ID: ' . session_id());
error_log('Session file: ' . ini_get('session.save_path') . '/sess_' . session_id());
error_log('Session data: ' . print_r($_SESSION, true));
error_log('Cookie data: ' . print_r($_COOKIE, true));

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

        // Use account data from session if available
        $userData = [
            'id' => $_SESSION['auth']['id'],
            'username' => $_SESSION['auth']['identifier'],
            'first_name' => $_SESSION['auth']['first_name'],
            'last_name' => $_SESSION['auth']['last_name'],
            'phone_number' => $_SESSION['auth']['phone_number'],
            'email' => $_SESSION['auth']['email']
        ];
        
        // Add account data if it exists in session
        if (isset($_SESSION['userInfo']['account'])) {
            $userData['account'] = $_SESSION['userInfo']['account'];
        }

        echo json_encode([
            'success' => true,
            'authenticated' => true,
            'user' => $userData,
            'userInfo' => $_SESSION['userInfo'] ?? null // Include the full userInfo object
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
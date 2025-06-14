<?php
require_once __DIR__ . '/../../config/SessionManager.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/error.log');

// Start output buffering
ob_start();

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $sessionManager = SessionManager::getInstance();

    // Log session data for debugging
    error_log("Session check - Session data: " . print_r($_SESSION, true));
    error_log("Session check - Cookie data: " . print_r($_COOKIE, true));

    // Check if session exists and is valid
    if (!$sessionManager->isAuthenticated()) {
        error_log("Session check failed - Not authenticated");
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'error' => 'Not authenticated'
    ]);
    exit();
}

    // Get session data
    $sessionData = $sessionManager->getSessionData();

    // Check if this is a new session (within 5 seconds of login)
    $isNewSession = isset($sessionData['logged_in_at']) && 
                   (time() - $sessionData['logged_in_at'] <= 5);

    // Only check expiry if it's not a new session
    if (!$isNewSession && $sessionManager->isSessionExpired()) {
        error_log("Session check failed - Session expired");
        $sessionManager->killSession();
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'error' => 'Internal server error'
    ]);
    exit();
}

// Update last activity time
    $sessionManager->updateActivity();

// Return session data
echo json_encode([
    'success' => true,
    'authenticated' => true,
        'user' => $sessionData
    ]);

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
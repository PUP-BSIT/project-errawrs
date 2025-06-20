<?php
/**
 * Logout API Endpoint
 * 
 * This endpoint destroys the current session and logs the user out.
 * It can be used both by explicit logout requests and session expiration handling.
 */

require_once __DIR__ . '/../../config/SessionManager.php';

$session = SessionManager::getInstance();
$session->initSession(); // Ensure session is started before trying to kill it

// Set JSON response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Or specify your domain
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Log the logout request
    if ($session->isAuthenticated()) {
        error_log('Logout request received. User: ' . ($_SESSION['auth']['identifier'] ?? 'unknown'));
    }

    // Clean up session
    $session->killSession();
    
    // Final check to ensure session is gone
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_unset();
        session_destroy();
    }
    
    // Clear cookie as a fallback
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Logout successful',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    // Even if there's an error, the client should proceed with logout
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An error occurred during logout.', 'details' => $e->getMessage()]);
} 
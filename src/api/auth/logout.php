<?php
/**
 * Logout API Endpoint
 * 
 * This endpoint destroys the current session and logs the user out.
 * It can be used both by explicit logout requests and session expiration handling.
 */

require_once __DIR__ . '/../../config/SessionManager.php';
$sessionManager = SessionManager::getInstance();

// Set JSON response headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Log the logout request
if ($sessionManager->isAuthenticated()) {
    error_log('Logout request received. User: ' . ($_SESSION['auth']['identifier'] ?? 'unknown'));
}

// Handle different request types
$requestMethod = $_SERVER['REQUEST_METHOD'];

switch ($requestMethod) {
    case 'POST':
        // Clean up session
        $sessionManager->killSession();
        
        // Return success response
        echo json_encode([
            'success' => true,
            'message' => 'Logout successful',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        break;
        
    case 'GET':
        // For GET requests (like session expiration checks)
        $expired = isset($_GET['expired']) && $_GET['expired'] === 'true';
        $message = $expired ? 'Session expired' : 'Logout successful';
        
        // Clean up session
        $sessionManager->killSession();
        
        // Return response
        echo json_encode([
            'success' => true,
            'message' => $message,
            'expired' => $expired,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        break;
        
    default:
        // Method not allowed
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed',
            'allowed_methods' => ['GET', 'POST']
        ]);
        break;
} 
<?php
/**
 * Logout API Endpoint
 * 
 * This endpoint destroys the current session and logs the user out.
 * It can be used both by explicit logout requests and session expiration handling.
 */

// Start session if not already started
session_start();

// Set JSON response headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Log the logout request
error_log('Logout request received. User: ' . ($_SESSION['auth']['identifier'] ?? 'unknown'));

// Function to clean up session and cookies
function cleanupSession() {
    // Clear all session variables
    $_SESSION = array();
    
    // Delete the session cookie
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }
    
    // Destroy the session
    session_destroy();
}

// Handle different request types
$requestMethod = $_SERVER['REQUEST_METHOD'];

switch ($requestMethod) {
    case 'POST':
        // Clean up session
        cleanupSession();
        
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
        cleanupSession();
        
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
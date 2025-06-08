<?php
/**
 * Session Killer API Endpoint
 * 
 * This endpoint is specifically designed to:
 * 1. Check if a session has expired
 * 2. Destroy expired sessions
 * 3. Support force-killing sessions
 * 
 * It can be called from cron jobs, monitoring systems, or client-side code
 * to ensure sessions are properly terminated when expired.
 */

// Start session if not already started
session_start();

// Set JSON response headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// Session timeout in seconds (5 minutes) - must match session_check.php
define('SESSION_TIMEOUT', 300);

// Force kill parameter - allows authorized systems to kill any session
$forceKill = isset($_GET['force']) && $_GET['force'] === 'true';

// User ID parameter - for killing specific user sessions (admin function)
$targetUserId = isset($_GET['user_id']) ? $_GET['user_id'] : null;

// Function to check if session has expired
function isSessionExpired() {
    // If no session exists
    if (!isset($_SESSION['auth']) || !isset($_SESSION['auth']['last_activity'])) {
        return true;
    }
    
    // Check timeout
    return (time() - $_SESSION['auth']['last_activity'] > SESSION_TIMEOUT);
}

// Function to clean up session completely
function killSession() {
    // Log the session kill
    error_log('Killing session for user: ' . ($_SESSION['auth']['identifier'] ?? 'unknown'));
    
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
    
    return true;
}

// Admin validation function - could be expanded to properly check admin rights
function isAuthorizedAdmin() {
    // Basic check for admin status in session
    return isset($_SESSION['auth']) && 
           isset($_SESSION['auth']['type']) && 
           $_SESSION['auth']['type'] === 'admin';
}

// Main logic
$wasExpired = isSessionExpired();
$wasKilled = false;

// Kill session if it's expired or force kill is requested
if ($wasExpired || $forceKill) {
    $wasKilled = killSession();
}
// Kill specific user session (admin function)
else if ($targetUserId !== null) {
    // Check if caller is an admin
    if (!isAuthorizedAdmin()) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized. Admin rights required to kill other user sessions.'
        ]);
        exit();
    }
    
    // If targeting the current user's session
    if ($_SESSION['auth']['id'] == $targetUserId) {
        $wasKilled = killSession();
    } else {
        // For targeting other users, we'd need a session store/database
        // This is a placeholder - implement database calls as needed
        echo json_encode([
            'success' => false,
            'error' => 'Killing other user sessions requires database integration'
        ]);
        exit();
    }
}

// Return results
echo json_encode([
    'success' => true,
    'was_expired' => $wasExpired,
    'was_killed' => $wasKilled,
    'timestamp' => date('Y-m-d H:i:s')
]); 
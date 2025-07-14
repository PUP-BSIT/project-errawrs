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

require_once __DIR__ . '/../../config/SessionManager.php';

// Start session if not already started
session_name('STACKOVERCASH_SESSID');
session_start();

// Set JSON response headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$sessionManager = SessionManager::getInstance();

// Force kill parameter - allows authorized systems to kill any session
$forceKill = isset($_GET['force']) && $_GET['force'] === 'true';

// User ID parameter - for killing specific user sessions (admin function)
$targetUserId = isset($_GET['user_id']) ? $_GET['user_id'] : null;

// Main logic
$wasExpired = $sessionManager->isSessionExpired();
$wasKilled = false;

// Kill session if it's expired or force kill is requested
if ($wasExpired || $forceKill) {
    $wasKilled = $sessionManager->killSession();
}
// Kill specific user session (admin function)
else if ($targetUserId !== null) {
    // Check if caller is an admin
    if (!$sessionManager->isAuthorizedAdmin()) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized. Admin rights required to kill other user sessions.'
        ]);
        exit();
    }
    
    // If targeting the current user's session
    if ($_SESSION['auth']['id'] == $targetUserId) {
        $wasKilled = $sessionManager->killSession();
    } else {
        // For targeting other users, we'd need a session store/database
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
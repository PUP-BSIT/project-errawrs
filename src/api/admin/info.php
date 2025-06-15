<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

// Get the session manager instance
$sessionManager = SessionManager::getInstance();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Log session data for debugging
error_log("Admin Info Request: SESSION DATA: " . print_r($_SESSION, true));

// Check if user is logged in and is an admin using SessionManager
if (!$sessionManager->isAuthorizedAdmin()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

try {
    $conn = db_connect();
    
    $stmt = $conn->prepare('SELECT admin_id, username, first_name, last_name, email FROM admin WHERE admin_id = ?');
    $stmt->bind_param('i', $_SESSION['auth']['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Admin not found');
    }
    
    $admin = $result->fetch_assoc();
    
    echo json_encode([
        'success' => true,
        'admin' => $admin
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
} 
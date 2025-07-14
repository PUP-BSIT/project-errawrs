<?php
require_once __DIR__ . '/../../config/SessionManager.php';

$session = SessionManager::getInstance();

// Prevent any HTML error output
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set JSON header first before any output
header('Content-Type: application/json');

// Function to handle errors
function sendError($message, $code = 400) {
    error_log("Get Teller Error: " . $message);
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

try {
    require_once __DIR__ . '/../../config/database.php';
} catch (Exception $e) {
    sendError('Configuration error: ' . $e->getMessage(), 500);
}

// Check if user is logged in and is an admin
if (!$session->isAuthorizedAdmin()) {
    sendError('Unauthorized access', 401);
}

$teller_id = intval(route_param(0)); // First parameter from URL path
if ($teller_id <= 0) {
    sendError('Invalid teller ID');
}

try {
    $conn = db_connect();
    
    $stmt = $conn->prepare('SELECT teller_id, teller_number, first_name, last_name, email, status FROM teller WHERE teller_id = ?');
    if (!$stmt) {
        throw new Exception("Failed to prepare query: " . $conn->error);
    }
    
    $stmt->bind_param('i', $teller_id);
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute query: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        sendError('Teller not found', 404);
    }
    
    $teller = $result->fetch_assoc();
    
    echo json_encode([
        'success' => true,
        'teller' => $teller
    ]);

} catch (Exception $e) {
    error_log("Get Teller Error: " . $e->getMessage());
    sendError('Failed to fetch teller: ' . $e->getMessage(), 500);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
} 
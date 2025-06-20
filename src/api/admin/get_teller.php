<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 3600');
    exit();
}

// Set the project root path
if (!defined('PROJECT_ROOT')) {
    define('PROJECT_ROOT', realpath(__DIR__ . '/../../..'));
}

// Enable error reporting and logging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', PROJECT_ROOT . '/logs/error.log');

// Include SessionManager
require_once PROJECT_ROOT . '/src/config/SessionManager.php';
$sessionManager = SessionManager::getInstance();

// Set JSON header first before any output
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Function to handle errors
function sendError($message, $code = 400) {
    error_log("Get Teller Error: " . $message);
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

try {
    require_once PROJECT_ROOT . '/src/config/database.php';
} catch (Exception $e) {
    sendError('Configuration error: ' . $e->getMessage(), 500);
}

// Verify admin is logged in using SessionManager
if (!$sessionManager->isAuthorizedAdmin()) {
    sendError('Unauthorized access', 401);
}

// Update activity to prolong session
$sessionManager->updateActivity();

if (!isset($_GET['id'])) {
    sendError('Missing teller ID');
}

$teller_id = intval($_GET['id']);
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
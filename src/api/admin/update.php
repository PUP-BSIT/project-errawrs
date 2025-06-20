<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
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
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");
header("Access-Control-Allow-Credentials: true");

// Function to handle errors
function sendError($message, $code = 400) {
    error_log("Update Teller Error: " . $message);
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

// Only allow PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    sendError('Method not allowed', 405);
}

// Verify admin is logged in using SessionManager
if (!$sessionManager->isAuthorizedAdmin()) {
    sendError('Unauthorized access', 401);
}

// Update activity to prolong session
$sessionManager->updateActivity();

try {
    require_once PROJECT_ROOT . '/src/config/database.php';
} catch (Exception $e) {
    sendError('Configuration error: ' . $e->getMessage(), 500);
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Check if this is a status update
if (isset($data['teller_id']) && isset($data['status'])) {
    try {
        $db = db_connect();
        $db->begin_transaction();
        $stmt = $db->prepare('UPDATE teller SET status = ? WHERE teller_id = ?');
        $stmt->bind_param('si', $data['status'], $data['teller_id']);
        if (!$stmt->execute()) {
            throw new Exception('Failed to update teller status');
        }
        $selectStmt = $db->prepare('SELECT teller_id, teller_number, first_name, last_name, email, status FROM teller WHERE teller_id = ?');
        $selectStmt->bind_param('i', $data['teller_id']);
        $selectStmt->execute();
        $result = $selectStmt->get_result();
        $teller = $result->fetch_assoc();
        $db->commit();
        echo json_encode(['success' => true, 'teller' => $teller]);
        exit();
    } catch (Exception $e) {
        if (isset($db)) {
            $db->rollback();
        }
        sendError($e->getMessage(), 500);
    }
}

// Regular teller information update
if (!isset($data['teller_id'], $data['first_name'], $data['last_name'], $data['email'])) {
    sendError('Missing required fields', 400);
}

try {
    $db = db_connect();
    $db->begin_transaction();
    $checkEmailStmt = $db->prepare('SELECT teller_id FROM teller WHERE email = ? AND teller_id != ?');
    $checkEmailStmt->bind_param('si', $data['email'], $data['teller_id']);
    $checkEmailStmt->execute();
    $emailResult = $checkEmailStmt->get_result();
    if ($emailResult->num_rows > 0) {
        throw new Exception('Email address is already in use by another teller');
    }
    $updateFields = ['first_name = ?', 'last_name = ?', 'email = ?'];
    $params = [$data['first_name'], $data['last_name'], $data['email']];
    $types = 'sss';
    if (isset($data['password']) && !empty($data['password'])) {
        $updateFields[] = 'password_hash = ?';
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        $types .= 's';
    }
    $params[] = $data['teller_id'];
    $types .= 'i';
    $query = 'UPDATE teller SET ' . implode(', ', $updateFields) . ' WHERE teller_id = ?';
    $stmt = $db->prepare($query);
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) {
        throw new Exception('Failed to update teller information');
    }
    $selectStmt = $db->prepare('SELECT teller_id, teller_number, first_name, last_name, email, status FROM teller WHERE teller_id = ?');
    $selectStmt->bind_param('i', $data['teller_id']);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $teller = $result->fetch_assoc();
    $db->commit();
    echo json_encode(['success' => true, 'teller' => $teller]);
} catch (Exception $e) {
    if (isset($db)) {
        $db->rollback();
    }
    sendError($e->getMessage(), 500);
} 
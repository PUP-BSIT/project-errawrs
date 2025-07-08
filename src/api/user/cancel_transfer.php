<?php
// Prevent PHP from displaying errors as HTML
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/SessionManager.php';
SessionManager::getInstance()->initSession();
header('Content-Type: application/json');

if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

unset($_SESSION['pending_transfer']);
unset($_SESSION['otp_verified']);

echo json_encode(['success' => true, 'message' => 'Pending transfer cancelled.']);
exit(); 
<?php
require_once __DIR__ . '/../../config/SessionManager.php';
SessionManager::getInstance()->initSession();
header('Content-Type: application/json');

define('DEBUG', true);

function validateUserAuthentication() {
    if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
        exit();
    }
}

function validateHttpMethod() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit();
    }
}

function cancelPendingTransfer() {
    unset($_SESSION['pending_transfer']);
    unset($_SESSION['otp_verified']);
}

validateUserAuthentication();
validateHttpMethod();

cancelPendingTransfer();

echo json_encode(['success' => true, 'message' => 'Pending transfer cancelled.']);
?> 
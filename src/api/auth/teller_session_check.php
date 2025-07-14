<?php
require_once __DIR__ . '/../../config/SessionManager.php';
header('Content-Type: application/json');
$session = SessionManager::getInstance();
if ($session->isAuthenticated() && $session->getSessionData()['type'] === 'teller') {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false]);
} 
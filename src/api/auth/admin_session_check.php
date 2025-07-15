<?php
require_once __DIR__ . '/../../config/SessionManager.php';
header('Content-Type: application/json');

// Debug logging
error_log("=== ADMIN SESSION CHECK DEBUG ===");
error_log("Request URL: " . $_SERVER['REQUEST_URI']);
error_log("HTTP Host: " . $_SERVER['HTTP_HOST']);
error_log("Session name: " . session_name());
error_log("Session ID: " . session_id());
error_log("All cookies: " . print_r($_COOKIE, true));

$session = SessionManager::getInstance();

// Check authentication
$isAuthenticated = $session->isAuthenticated();
error_log("Is authenticated: " . ($isAuthenticated ? 'true' : 'false'));

if ($isAuthenticated) {
    $sessionData = $session->getSessionData();
    error_log("Session data: " . print_r($sessionData, true));
    
    $isAdmin = isset($sessionData['type']) && $sessionData['type'] === 'admin';
    error_log("Is admin: " . ($isAdmin ? 'true' : 'false'));
    
    if ($isAdmin) {
        error_log("✅ Admin session check successful");
        echo json_encode(['success' => true, 'admin' => $sessionData]);
    } else {
        error_log("❌ Session type is not admin: " . ($sessionData['type'] ?? 'undefined'));
        echo json_encode(['success' => false, 'message' => 'Not an admin session', 'session_type' => $sessionData['type'] ?? 'undefined']);
    }
} else {
    error_log("❌ Not authenticated");
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
} 
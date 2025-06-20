<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/database.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $token = $input['token'] ?? null;

    if (empty($token)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Token is required.']);
        exit();
    }

    $db = db_connect();
    $stmt = $db->prepare('SELECT user_id FROM password_reset_requests WHERE token = ? AND expires_at > NOW()');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token. Please request a new reset link.']);
    }
    
    $stmt->close();
    $db->close();

} catch (Exception $e) {
    error_log("Verify Token Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred.']);
} 
<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

define('DEBUG', true);

function validateToken($input) {
    $token = $input['token'] ?? null;

    if (empty($token)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Token is required.']);
        exit();
    }
    
    return $token;
}

function verifyResetToken($db, $token) {
    $tokenQuery = $db->prepare(
        'SELECT user_id FROM password_reset_requests WHERE token = ? AND expires_at > NOW()'
    );
    $tokenQuery->bind_param('s', $token);
    $tokenQuery->execute();
    $result = $tokenQuery->get_result();
    
    return $result->num_rows === 1;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $token = validateToken($input);

    $db = db_connect();
    $isValidToken = verifyResetToken($db, $token);

    if ($isValidToken) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Invalid or expired token. Please request a new reset link.'
        ]);
    }
    
    $db->close();

} catch (Exception $e) {
    if (DEBUG) {
        error_log("Verify Token Error: " . $e->getMessage());
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred.']);
}
?> 
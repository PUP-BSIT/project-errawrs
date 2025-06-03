<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['auth']['id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['auth']['id'];

try {
    $conn = db_connect();
    
    $stmt = $conn->prepare('SELECT user_id, username, first_name, last_name, phone_number FROM user WHERE user_id = ?');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // This case should ideally not happen if the session is valid, but it's a safeguard
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit();
    }
    
    $user = $result->fetch_assoc();
    
    echo json_encode([
        'success' => true,
        'user' => $user
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
}
?> 
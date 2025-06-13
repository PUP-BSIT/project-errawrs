<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../config/database.php';

// Check if admin is logged in
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'admin') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit();
}

try {
    $db = db_connect();
    $query = 'SELECT user_id, username, first_name, last_name, phone_number, created_at FROM user';
    $result = $db->query($query);
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'user_id' => $row['user_id'],
            'username' => $row['username'],
            'first_name' => $row['first_name'],
            'last_name' => $row['last_name'],
            'phone_number' => $row['phone_number'],
            'created_at' => $row['created_at'],
        ];
    }
    echo json_encode(['success' => true, 'users' => $users]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($db)) db_close($db);
} 
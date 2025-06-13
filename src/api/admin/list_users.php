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
    // Subquery to get the first active account per user
    $query = '
        SELECT 
            u.user_id, 
            a.account_number, 
            u.username, 
            u.first_name, 
            u.last_name, 
            u.phone_number, 
            u.created_at
        FROM user u
        LEFT JOIN account a 
            ON a.account_id = (
                SELECT account_id 
                FROM account 
                WHERE user_id = u.user_id AND status = "active" 
                ORDER BY created_at ASC LIMIT 1
            )
    ';
    $result = $db->query($query);
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'user_id' => $row['user_id'],
            'account_number' => $row['account_number'],
            'account_number' => $row['account_number'],
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
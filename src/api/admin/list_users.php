<?php

require_once __DIR__ . '/../../config/SessionManager.php';

// Initialize SessionManager to start or resume the session
$sessionManager = SessionManager::getInstance();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if admin is logged in using SessionManager
if (!$sessionManager->isAuthorizedAdmin()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit();
}

// Update activity to prolong session
$sessionManager->updateActivity();

require_once __DIR__ . '/../../config/database.php';

try {
    $db = db_connect();
    // Get all users and all their accounts (active and closed)
    $query = '
        SELECT 
            u.user_id, 
            u.username, 
            u.first_name, 
            u.last_name, 
            u.phone_number, 
            u.created_at AS user_created_at,
            a.account_number,
            a.balance,
            a.status AS account_status,
            a.account_type,
            a.created_at AS account_created_at
        FROM user u
        LEFT JOIN account a ON u.user_id = a.user_id
        ORDER BY u.user_id, a.account_id
    ';
    $result = $db->query($query);
    $list = [];
    while ($row = $result->fetch_assoc()) {
        $list[] = [
            'user_id' => $row['user_id'],
            'username' => $row['username'],
            'first_name' => $row['first_name'],
            'last_name' => $row['last_name'],
            'phone_number' => $row['phone_number'],
            'user_created_at' => $row['user_created_at'],
            'account_number' => $row['account_number'],
            'balance' => $row['balance'],
            'account_status' => $row['account_status'],
            'account_type' => $row['account_type'],
            'account_created_at' => $row['account_created_at']
        ];
    }
    // Log the list before encoding
    error_log("List Users API: Data list prepared: " . print_r($list, true));
    
    echo json_encode(['success' => true, 'list' => $list]);
} catch (Exception $e) {
    http_response_code(500);
    error_log("List Users API Error: " . $e->getMessage()); // Log server-side errors
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($db)) db_close($db);
} 
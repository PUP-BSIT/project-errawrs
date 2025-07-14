<?php
require_once __DIR__ . '/../../../src/config/database.php';
require_once __DIR__ . '/../../../src/config/SessionManager.php';

header('Content-Type: application/json; charset=utf-8');

// Accept user ID as RESTful path param (from $params['id']), query param, or parse from REQUEST_URI
$user_id = null;
if (isset($params) && isset($params['id'])) {
    $user_id = intval($params['id']);
} elseif (isset($_GET['user_id'])) {
    $user_id = intval($_GET['user_id']);
} else {
    // Try to parse from REQUEST_URI (e.g., /api/admin/users/15)
    if (preg_match('~/api/admin/users/(\d+)~', $_SERVER['REQUEST_URI'], $matches)) {
        $user_id = intval($matches[1]);
    }
}

if (!$user_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing user_id parameter']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $db = db_connect();
    if (!$db) {
        throw new Exception('Database connection failed');
    }

    $stmt = $db->prepare('SELECT user_id, username, first_name, last_name, phone_number, created_at, date_of_birth, nationality, street, city, zip_code, country, email, id_type, id_image FROM user WHERE user_id = ? LIMIT 1');
    if (!$stmt) {
        throw new Exception('Failed to prepare statement: ' . $db->error);
    }
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit();
    }
    $user = $result->fetch_assoc();
    $stmt->close();
    $db->close();

    echo json_encode(['success' => true, 'user' => $user]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
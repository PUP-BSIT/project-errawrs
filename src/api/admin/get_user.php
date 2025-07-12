<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
if ($user_id <= 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid user_id']);
    exit;
}

try {
    $conn = db_connect();
    $stmt = $conn->prepare('SELECT user_id, username, first_name, last_name, phone_number, created_at, date_of_birth, nationality, street, city, zip_code, country, email, id_type, id_image FROM user WHERE user_id = ? LIMIT 1');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    if ($user) {
        if (!empty($user['id_image'])) {
            $user['id_image'] = '/src/api/user/uploads/registration/' . $user_id . '/' . $user['id_image'];
        }
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'error' => 'User not found']);
    }
    $stmt->close();
    db_close($conn);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error']);
} 
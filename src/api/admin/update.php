<?php
require_once __DIR__ . '/../../config/SessionManager.php';
$session = SessionManager::getInstance();

if (!$session->isAuthorizedAdmin()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['teller_id'], $data['first_name'], $data['last_name'], $data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit();
}

try {
    $db = db_connect();
    
    // Start transaction
    $db->begin_transaction();
    
    // Check if email is already taken by another teller
    $checkEmailStmt = $db->prepare('SELECT teller_id FROM teller WHERE email = ? AND teller_id != ?');
    $checkEmailStmt->bind_param('si', $data['email'], $data['teller_id']);
    $checkEmailStmt->execute();
    $emailResult = $checkEmailStmt->get_result();
    
    if ($emailResult->num_rows > 0) {
        throw new Exception('Email address is already in use by another teller');
    }
    
    // Prepare base update query
    $updateFields = ['first_name = ?', 'last_name = ?', 'email = ?'];
    $params = [$data['first_name'], $data['last_name'], $data['email']];
    $types = 'sss';
    
    // Add password update if provided
    if (isset($data['password']) && !empty($data['password'])) {
        $updateFields[] = 'password_hash = ?';
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        $types .= 's';
    }
    
    // Add teller_id to parameters
    $params[] = $data['teller_id'];
    $types .= 'i';
    
    // Construct and execute update query
    $query = 'UPDATE teller SET ' . implode(', ', $updateFields) . ' WHERE teller_id = ?';
    $stmt = $db->prepare($query);
    $stmt->bind_param($types, ...$params);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to update teller information');
    }
    
    // Get updated teller information
    $selectStmt = $db->prepare('SELECT teller_id, teller_number, first_name, last_name, email, status FROM teller WHERE teller_id = ?');
    $selectStmt->bind_param('i', $data['teller_id']);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $teller = $result->fetch_assoc();
    
    // Commit transaction
    $db->commit();
    
    echo json_encode(['success' => true, 'teller' => $teller]);
} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($db)) {
        $db->rollback();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
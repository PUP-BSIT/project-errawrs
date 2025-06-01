<?php
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

if (!isset($_GET['teller_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing teller_id parameter']);
    exit();
}

$teller_id = intval($_GET['teller_id']);

try {
    $db = db_connect();
    $stmt = $db->prepare('SELECT teller_id, teller_number, first_name, last_name, email, status FROM teller WHERE teller_id = ?');
    $stmt->bind_param('i', $teller_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Teller not found']);
        exit();
    }
    
    $teller = $result->fetch_assoc();
    echo json_encode(['success' => true, 'teller' => $teller]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
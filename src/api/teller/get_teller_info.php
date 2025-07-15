<?php
// Teller info lookup for set password page (public, safe info only)
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (!isset($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing email']);
    exit();
}

$email = $data['email'];

try {
    $db = db_connect();
    $stmt = $db->prepare('SELECT teller_number, first_name, last_name, status FROM teller WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Teller not found']);
        exit();
    }
    $teller = $result->fetch_assoc();
    echo json_encode([
        'success' => true,
        'teller_number' => $teller['teller_number'],
        'first_name' => $teller['first_name'],
        'last_name' => $teller['last_name'],
        'status' => $teller['status']
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} 
<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? '';

if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email is required']);
    exit();
}

try {
    $db = db_connect();
    $stmt = $db->prepare('SELECT teller_number, first_name, last_name FROM teller WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $teller = $result->fetch_assoc();
    
    if (!$teller) {
        echo json_encode(['success' => false, 'message' => 'Teller not found']);
        exit();
    }
    
    echo json_encode([
        'success' => true,
        'teller_number' => $teller['teller_number'],
        'first_name' => $teller['first_name'],
        'last_name' => $teller['last_name']
    ]);
    
} catch (Exception $e) {
    error_log('Get Teller Info Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($db)) db_close($db);
} 
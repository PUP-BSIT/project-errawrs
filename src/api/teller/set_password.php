<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$teller_email = $input['teller_email'] ?? '';
$password = $input['password'] ?? '';

if (!$teller_email || !$password) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing email or password']);
    exit();
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters']);
    exit();
}

try {
    $db = db_connect();
    $db->begin_transaction();
    
    // Check if teller exists and is in pending status (new account setup)
    $stmt = $db->prepare('SELECT teller_id, status FROM teller WHERE email = ?');
    $stmt->bind_param('s', $teller_email);
    $stmt->execute();
    $result = $stmt->get_result();
    $teller = $result->fetch_assoc();
    
    if (!$teller) {
        throw new Exception('Invalid email address');
    }
    
    // Allow password change for both pending and active tellers
    if ($teller['status'] !== 'pending' && $teller['status'] !== 'active') {
        throw new Exception('Account is not eligible for password change.');
    }
    
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    if ($teller['status'] === 'pending') {
        $stmt = $db->prepare('UPDATE teller SET password_hash = ?, status = "active" WHERE teller_id = ?');
        $stmt->bind_param('si', $password_hash, $teller['teller_id']);
    } else {
        $stmt = $db->prepare('UPDATE teller SET password_hash = ? WHERE teller_id = ?');
        $stmt->bind_param('si', $password_hash, $teller['teller_id']);
    }
    $stmt->execute();
    
    if ($stmt->affected_rows === 0) {
        throw new Exception('Failed to update teller account');
    }
    
    $db->commit();
    echo json_encode(['success' => true, 'message' => 'Account setup complete! You can now log in.']);
    
} catch (Exception $e) {
    if (isset($db)) $db->rollback();
    error_log('Teller Password Setup Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($db)) db_close($db);
} 
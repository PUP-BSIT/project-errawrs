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
$token = $input['token'] ?? '';

if ($token) {
    // Password reset via token
    require_once __DIR__ . '/../../config/database.php';
    $db = db_connect();
    $stmt = $db->prepare('SELECT teller_email FROM password_resets WHERE token = ? AND expires_at > NOW()');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    if (!$row) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit();
    }
    $teller_email = $row['teller_email'];
    // Continue to password update below
}

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
    $stmt = $db->prepare('SELECT teller_id FROM teller WHERE email = ?');
    $stmt->bind_param('s', $teller_email);
    $stmt->execute();
    $result = $stmt->get_result();
    $teller = $result->fetch_assoc();
    if (!$teller) {
        throw new Exception('Invalid email');
    }
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare('UPDATE teller SET password_hash = ?, status = "active" WHERE teller_id = ?');
    $stmt->bind_param('si', $password_hash, $teller['teller_id']);
    $stmt->execute();
    if ($stmt->affected_rows === 0) {
        throw new Exception('Failed to update teller account');
    }
    $db->commit();
    echo json_encode(['success' => true, 'message' => 'Account setup complete! You can now log in.']);
    exit();
} catch (Exception $e) {
    if (isset($db)) $db->rollback();
    error_log('Teller Password Setup Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($db)) db_close($db);
} 
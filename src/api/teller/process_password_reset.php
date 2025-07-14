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
$token = $input['token'] ?? '';
$password = $input['password'] ?? '';

if (!$token || !$password) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Token and password are required']);
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
    
    // Verify token and get teller info
    $stmt = $db->prepare('SELECT pr.user_id, pr.expires_at, t.first_name, t.last_name, t.status 
                         FROM password_reset_requests pr 
                         JOIN teller t ON pr.user_id = t.teller_id 
                         WHERE pr.token = ? AND pr.user_type = "teller" AND pr.expires_at > NOW()');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit();
    }
    
    $reset_request = $result->fetch_assoc();
    
    // Check if account is active
    if ($reset_request['status'] !== 'active') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Account is not active. Please contact your administrator.']);
        exit();
    }
    
    // Update password
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    $updateStmt = $db->prepare('UPDATE teller SET password_hash = ? WHERE teller_id = ?');
    $updateStmt->bind_param('si', $password_hash, $reset_request['user_id']);
    $updateStmt->execute();
    
    if ($updateStmt->affected_rows === 0) {
        throw new Exception('Failed to update password');
    }
    
    // Delete the used token
    $deleteStmt = $db->prepare('DELETE FROM password_reset_requests WHERE token = ?');
    $deleteStmt->bind_param('s', $token);
    $deleteStmt->execute();
    
    $db->commit();
    
    echo json_encode([
        'success' => true, 
        'message' => 'Password has been reset successfully. You can now log in with your new password.'
    ]);
    
} catch (Exception $e) {
    if (isset($db)) $db->rollback();
    error_log('Teller Process Password Reset Error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($updateStmt)) $updateStmt->close();
    if (isset($deleteStmt)) $deleteStmt->close();
    if (isset($db)) db_close($db);
} 
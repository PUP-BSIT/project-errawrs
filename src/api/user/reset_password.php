<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/database.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $token = $input['token'] ?? null;
    $password = $input['password'] ?? null;

    if (empty($token) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Token and new password are required.']);
        exit();
    }

    if (strlen($password) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters long.']);
        exit();
    }
    
    $db = db_connect();
    $db->begin_transaction();

    try {
        $stmt = $db->prepare('SELECT user_id FROM password_reset_requests WHERE token = ? AND expires_at > NOW()');
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows !== 1) {
            throw new Exception('Invalid or expired token.');
        }

        $request = $result->fetch_assoc();
        $user_id = $request['user_id'];
        
        // Hash the new password
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Update the user's password
        $updateStmt = $db->prepare('UPDATE user SET password_hash = ? WHERE user_id = ?');
        $updateStmt->bind_param('si', $hashed_password, $user_id);
        $updateStmt->execute();

        // Delete the token
        $deleteStmt = $db->prepare('DELETE FROM password_reset_requests WHERE token = ?');
        $deleteStmt->bind_param('s', $token);
        $deleteStmt->execute();

        $db->commit();

        echo json_encode(['success' => true, 'message' => 'Your password has been reset successfully.']);

    } catch (Exception $e) {
        $db->rollback();
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }

} catch (Exception $e) {
    error_log("Reset Password Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred.']);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($updateStmt)) $updateStmt->close();
    if (isset($deleteStmt)) $deleteStmt->close();
    if (isset($db) && $db->ping()) $db->close();
} 
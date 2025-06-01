<?php
require_once __DIR__ . '/../../config/database.php';
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if user is logged in and is an admin
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!isset($data['teller_id'])) {
        throw new Exception('Teller ID is required');
    }

    $conn = db_connect();
    
    // Get current status
    $stmt = $conn->prepare('SELECT status FROM teller WHERE teller_id = ?');
    $stmt->bind_param('i', $data['teller_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Teller not found');
    }
    
    $current_status = $result->fetch_assoc()['status'];
    $new_status = $current_status === 'active' ? 'inactive' : 'active';
    
    // Update status
    $stmt = $conn->prepare('UPDATE teller SET status = ? WHERE teller_id = ?');
    $stmt->bind_param('si', $new_status, $data['teller_id']);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to update teller status');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Teller status updated successfully',
        'teller' => [
            'teller_id' => $data['teller_id'],
            'status' => $new_status
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
} 
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
$email = $input['email'] ?? '';

if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email is required']);
    exit();
}

try {
    $db = db_connect();
    
    // Check if teller exists
    $stmt = $db->prepare('SELECT teller_id, first_name, last_name FROM teller WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Teller not found with this email']);
        exit();
    }
    
    $teller = $result->fetch_assoc();
    
    // For testing purposes, we'll just return success
    // In production, this would send a reset email
    echo json_encode([
        'success' => true, 
        'message' => 'Password reset request received. Please check your email for reset instructions.'
    ]);
    
} catch (Exception $e) {
    error_log('Teller Reset Password Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($db)) $db->close();
} 
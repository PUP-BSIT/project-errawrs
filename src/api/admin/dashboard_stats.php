<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

$session = SessionManager::getInstance();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if user is logged in and is an admin
if (!$session->isAuthenticated() || $session->getSessionData()['type'] !== 'admin') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

try {
    $conn = db_connect();
    
    // Get total users count
    $result = $conn->query('SELECT COUNT(*) as total FROM user');
    $total_users = $result ? $result->fetch_assoc()['total'] : 0;
    
    // Get total transactions count
    $result = $conn->query('SELECT COUNT(*) as total FROM transaction');
    $total_transactions = $result ? $result->fetch_assoc()['total'] : 0;
    
    // Get active tellers count
    $result = $conn->query("SELECT COUNT(*) as total FROM teller WHERE status = 'active'");
    $active_tellers = $result ? $result->fetch_assoc()['total'] : 0;
    
    // Get pending tellers count
    $result = $conn->query("SELECT COUNT(*) as total FROM teller WHERE status = 'pending'");
    $pending_tellers = $result ? $result->fetch_assoc()['total'] : 0;
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'total_users' => (int)$total_users,
            'total_transactions' => (int)$total_transactions,
            'active_tellers' => (int)$active_tellers,
            'pending_tellers' => (int)$pending_tellers
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
} 
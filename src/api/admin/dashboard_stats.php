<?php
require_once __DIR__ . '/../../config/database.php';
session_start();

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
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

try {
    $conn = db_connect();
    
    // Get current month and last month dates
    $current_month_start = date('Y-m-01 00:00:00');
    $current_month_end = date('Y-m-t 23:59:59');
    $last_month_start = date('Y-m-01 00:00:00', strtotime('-1 month'));
    $last_month_end = date('Y-m-t 23:59:59', strtotime('-1 month'));
    
    // Get total users count and change
    $current_users = $conn->query("SELECT COUNT(*) as total FROM user WHERE created_at <= '$current_month_end'")->fetch_assoc()['total'];
    $last_month_users = $conn->query("SELECT COUNT(*) as total FROM user WHERE created_at <= '$last_month_end'")->fetch_assoc()['total'];
    $users_change = $last_month_users > 0 ? (($current_users - $last_month_users) / $last_month_users) * 100 : 0;
    
    // Get total transactions count and change
    $current_transactions = $conn->query("SELECT COUNT(*) as total FROM transaction WHERE created_at BETWEEN '$current_month_start' AND '$current_month_end'")->fetch_assoc()['total'];
    $last_month_transactions = $conn->query("SELECT COUNT(*) as total FROM transaction WHERE created_at BETWEEN '$last_month_start' AND '$last_month_end'")->fetch_assoc()['total'];
    $transactions_change = $last_month_transactions > 0 ? (($current_transactions - $last_month_transactions) / $last_month_transactions) * 100 : 0;
    
    // Get active tellers count and change
    $current_tellers = $conn->query("SELECT COUNT(*) as total FROM teller WHERE status = 'active'")->fetch_assoc()['total'];
    $last_month_tellers = $conn->query("SELECT COUNT(*) as total FROM teller WHERE status = 'active' AND created_at <= '$last_month_end'")->fetch_assoc()['total'];
    $tellers_change = $last_month_tellers > 0 ? (($current_tellers - $last_month_tellers) / $last_month_tellers) * 100 : 0;
    
    // Get pending issues count and change
    $current_issues = 0;
    $last_month_issues = 0;
    $issues_change = 0;
    
    $result = $conn->query("SHOW TABLES LIKE 'issue'");
    if ($result && $result->num_rows > 0) {
        $current_issues = $conn->query("SELECT COUNT(*) as total FROM issue WHERE status = 'pending' AND created_at <= '$current_month_end'")->fetch_assoc()['total'];
        $last_month_issues = $conn->query("SELECT COUNT(*) as total FROM issue WHERE status = 'pending' AND created_at <= '$last_month_end'")->fetch_assoc()['total'];
        $issues_change = $last_month_issues > 0 ? (($current_issues - $last_month_issues) / $last_month_issues) * 100 : 0;
    }
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'total_users' => [
                'count' => (int)$current_users,
                'change' => round($users_change, 1)
            ],
            'total_transactions' => [
                'count' => (int)$current_transactions,
                'change' => round($transactions_change, 1)
            ],
            'active_tellers' => [
                'count' => (int)$current_tellers,
                'change' => round($tellers_change, 1)
            ],
            'pending_issues' => [
                'count' => (int)$current_issues,
                'change' => round($issues_change, 1)
            ]
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
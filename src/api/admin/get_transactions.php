<?php
require_once __DIR__ . '/../../config/database.php';
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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

    // Pagination parameters
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    // Search and filter parameters
    $search_query = isset($_GET['search_query']) ? trim($_GET['search_query']) : '';
    $status_filter = isset($_GET['status']) ? strtolower(trim($_GET['status'])) : ''; // 'all', 'success', 'pending', 'failed'

    $sql_conditions = [];
    $sql_params = [];
    $sql_types = '';

    // Add status filter
    if ($status_filter && $status_filter !== 'all') {
        $sql_conditions[] = "t.status = ?";
        $sql_params[] = $status_filter;
        $sql_types .= 's';
    }

    // Add search query
    if (!empty($search_query)) {
        $sql_conditions[] = "(t.transaction_id LIKE ? OR su.username LIKE ? OR ru.username LIKE ?)";
        $sql_params[] = "%" . $search_query . "%";
        $sql_params[] = "%" . $search_query . "%";
        $sql_params[] = "%" . $search_query . "%";
        $sql_types .= 'sss';
    }

    $where_clause = '';
    if (!empty($sql_conditions)) {
        $where_clause = 'WHERE ' . implode(' AND ', $sql_conditions);
    }

    // Get total count of transactions for pagination
    $count_sql = "SELECT COUNT(t.transaction_id) as total_count FROM transaction t 
                  LEFT JOIN account sa ON t.sender_account_id = sa.account_id
                  LEFT JOIN user su ON sa.user_id = su.user_id
                  LEFT JOIN account ra ON t.receiver_account_id = ra.account_id
                  LEFT JOIN user ru ON ra.user_id = ru.user_id
                  " . $where_clause;
    
    $count_stmt = $conn->prepare($count_sql);
    if (!empty($sql_params)) {
        $count_stmt->bind_param($sql_types, ...$sql_params);
    }
    $count_stmt->execute();
    $total_count_result = $count_stmt->get_result()->fetch_assoc();
    $total_transactions = $total_count_result['total_count'];
    $count_stmt->close();

    // Get transactions with joins for user and teller info
    $sql = "SELECT 
                t.transaction_id, 
                t.amount, 
                t.transaction_type, 
                t.status, 
                t.created_at AS transaction_date, 
                t.description,
                su.username AS sender_username, 
                su.first_name AS sender_first_name, 
                su.last_name AS sender_last_name,
                ru.username AS receiver_username, 
                ru.first_name AS receiver_first_name, 
                ru.last_name AS receiver_last_name
            FROM 
                transaction t
            LEFT JOIN 
                account sa ON t.sender_account_id = sa.account_id
            LEFT JOIN 
                user su ON sa.user_id = su.user_id
            LEFT JOIN 
                account ra ON t.receiver_account_id = ra.account_id
            LEFT JOIN 
                user ru ON ra.user_id = ru.user_id
            " . $where_clause . "
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Failed to prepare statement: ' . $conn->error);
    }

    $sql_types .= 'ii'; // Add types for limit and offset
    $sql_params[] = $limit;
    $sql_params[] = $offset;

    if (!empty($sql_params)) {
        $stmt->bind_param($sql_types, ...$sql_params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'transactions' => $transactions,
        'total_transactions' => (int)$total_transactions,
        'page' => (int)$page,
        'limit' => (int)$limit,
        'total_pages' => ceil($total_transactions / $limit)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
} 
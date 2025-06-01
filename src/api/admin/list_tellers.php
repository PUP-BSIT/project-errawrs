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
    
    // Get pagination parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;
    $offset = ($page - 1) * $limit;
    
    // Get search parameter
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    // Build query
    $where = '';
    $params = [];
    $types = '';
    
    if (!empty($search)) {
        $where = "WHERE teller_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?";
        $searchTerm = "%$search%";
        $params = array_fill(0, 4, $searchTerm);
        $types = str_repeat('s', 4);
    }
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM teller" . ($where ? " $where" : "");
    if (!empty($params)) {
        $stmt = $conn->prepare($countQuery);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $total = $stmt->get_result()->fetch_assoc()['total'];
    } else {
        $total = $conn->query($countQuery)->fetch_assoc()['total'];
    }
    
    // Get tellers
    $query = "SELECT teller_id, teller_number, first_name, last_name, email, status 
              FROM teller" . ($where ? " $where" : "") . " 
              ORDER BY teller_id DESC 
              LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        $stmt->bind_param($types . 'ii', ...[...$params, $limit, $offset]);
    } else {
        $stmt->bind_param('ii', $limit, $offset);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tellers = [];
    while ($row = $result->fetch_assoc()) {
        $tellers[] = [
            'teller_id' => $row['teller_id'],
            'teller_number' => $row['teller_number'],
            'first_name' => $row['first_name'],
            'last_name' => $row['last_name'],
            'email' => $row['email'],
            'status' => $row['status']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'tellers' => $tellers,
        'total' => $total,
        'page' => $page,
        'limit' => $limit
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
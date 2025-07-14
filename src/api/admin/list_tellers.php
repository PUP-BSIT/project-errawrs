<?php

// Enable error logging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/error.log');

require_once __DIR__ . '/../../config/SessionManager.php';

// Initialize SessionManager to start or resume the session
$sessionManager = SessionManager::getInstance();

// Debug headers
header('X-Debug-Session-Status: ' . (session_status() === PHP_SESSION_ACTIVE ? 'Active' : 'Inactive'));
header('X-Debug-Session-ID: ' . session_id());
header('X-Debug-Auth: ' . ($sessionManager->isAuthenticated() ? 'Present' : 'Missing'));
header('X-Debug-Auth-Type: ' . ($sessionManager->isAuthenticated() ? ($sessionManager->getSessionData()['type'] ?? 'None') : 'None'));

// Set JSON header first before any output
header('Content-Type: application/json');

// Function to handle errors
function sendError($message, $code = 400) {
    error_log("List Tellers Error: " . $message);
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

// Debug session data
error_log("Session data: " . print_r($_SESSION, true));

// Check if user is logged in and is an admin using SessionManager
if (
    !$sessionManager->isAuthenticated() ||
    !isset($_SESSION['auth']['type']) ||
    $_SESSION['auth']['type'] !== 'admin'
) {
    sendError('Unauthorized access', 401);
}

// Update activity to prolong session
$sessionManager->updateActivity();

try {
    error_log("List Tellers: Loading database configuration");
    require_once __DIR__ . '/../../config/database.php';
    
    error_log("List Tellers: Connecting to database");
    $conn = db_connect();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    error_log("List Tellers: Database connection successful");
    
    // Get pagination parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;
    $offset = ($page - 1) * $limit;
    
    error_log("List Tellers: Pagination - Page: $page, Limit: $limit, Offset: $offset");
    
    // Get search parameter
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    error_log("List Tellers: Search term: " . $search);
    
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
    error_log("List Tellers: Count query - " . $countQuery);
    
    if (!empty($params)) {
        $stmt = $conn->prepare($countQuery);
        if (!$stmt) {
            throw new Exception("Failed to prepare count query: " . $conn->error);
        }
        $stmt->bind_param($types, ...$params);
        if (!$stmt->execute()) {
            throw new Exception("Failed to execute count query: " . $stmt->error);
        }
        $result = $stmt->get_result();
        if (!$result) {
            throw new Exception("Failed to get count result: " . $stmt->error);
        }
        $total = $result->fetch_assoc()['total'];
    } else {
        $result = $conn->query($countQuery);
        if (!$result) {
            throw new Exception("Failed to execute count query: " . $conn->error);
        }
        $total = $result->fetch_assoc()['total'];
    }
    
    error_log("List Tellers: Total count - $total");
    
    // Get tellers
    $query = "SELECT teller_id, teller_number, first_name, last_name, email, status 
              FROM teller" . ($where ? " $where" : "") . " 
              ORDER BY teller_id DESC 
              LIMIT ? OFFSET ?";
              
    error_log("List Tellers: Tellers query - " . $query);
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Failed to prepare tellers query: " . $conn->error);
    }
    
    if (!empty($params)) {
        if (!$stmt->bind_param($types . 'ii', ...[...$params, $limit, $offset])) {
            throw new Exception("Failed to bind parameters: " . $stmt->error);
        }
    } else {
        if (!$stmt->bind_param('ii', $limit, $offset)) {
            throw new Exception("Failed to bind parameters: " . $stmt->error);
        }
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute tellers query: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    if (!$result) {
        throw new Exception("Failed to get result set: " . $stmt->error);
    }
    
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
    
    error_log("List Tellers: Found " . count($tellers) . " tellers");
    
    $response = [
        'success' => true,
        'tellers' => $tellers,
        'total' => $total,
        'page' => $page,
        'limit' => $limit
    ];
    
    error_log("List Tellers: Sending response - " . json_encode($response));
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("List Tellers Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    sendError('Failed to fetch tellers: ' . $e->getMessage(), 500);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
} 
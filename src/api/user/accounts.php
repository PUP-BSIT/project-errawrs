<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/error.log');

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Initialize session
$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

// Debug logging
error_log("Session data in accounts.php: " . print_r($_SESSION, true));

// Check authentication
if (!$sessionManager->isAuthenticated()) {
    error_log("Unauthorized access attempt to accounts.php. Session data: " . print_r($_SESSION, true));
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized access']);
    exit();
}

try {
    $conn = db_connect();
    $userId = $_SESSION['auth']['id'];
    
    error_log("Fetching accounts for user ID: " . $userId);
    
    // Fetch accounts for the logged-in user
    $query = "SELECT account_id, account_number, balance, status, account_type, created_at 
              FROM account 
              WHERE user_id = ? AND status = 'active' 
              ORDER BY created_at ASC";
              
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("i", $userId);
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute statement: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    if (!$result) {
        throw new Exception("Failed to get result: " . $stmt->error);
    }
    
    $accounts = [];
    while ($row = $result->fetch_assoc()) {
        // Format balance as decimal
        $row['balance'] = number_format((float)$row['balance'], 2, '.', '');
        $accounts[] = $row;
    }
    
    error_log("Found accounts: " . print_r($accounts, true));
    
    echo json_encode(['data' => $accounts]);
    
} catch (Exception $e) {
    error_log("Error in accounts.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
}
?> 
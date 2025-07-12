<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

define('DEBUG', true);

function handlePreflightRequest() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

function validateUserAuthentication() {
    global $sessionManager;
    if (!$sessionManager->isAuthenticated()) {
        if (DEBUG) {
            error_log("Unauthorized access attempt to accounts.php. Session data: " . 
                print_r($_SESSION, true));
        }
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
        exit();
    }
}

function getAccountsQuery() {
    return "SELECT account_id, account_number, balance, status, account_type, created_at 
            FROM account 
            WHERE user_id = ? AND status = 'active' 
            ORDER BY created_at ASC";
}

function fetchUserAccounts($db, $userId) {
    $query = getAccountsQuery();
    $accountsQuery = $db->prepare($query);
    
    if (!$accountsQuery) {
        throw new Exception("Failed to prepare statement: " . $db->error);
    }
    
    $accountsQuery->bind_param("i", $userId);
    if (!$accountsQuery->execute()) {
        throw new Exception("Failed to execute statement: " . $accountsQuery->error);
    }
    
    $result = $accountsQuery->get_result();
    if (!$result) {
        throw new Exception("Failed to get result: " . $accountsQuery->error);
    }
    
    return $result;
}

function processAccountsData($result) {
    $accounts = [];
    
    while ($row = $result->fetch_assoc()) {
        $row['balance'] = number_format((float)$row['balance'], 2, '.', '');
        $accounts[] = $row;
    }
    
    if (DEBUG) {
        error_log("Found accounts: " . print_r($accounts, true));
    }
    
    return $accounts;
}

handlePreflightRequest();
validateUserAuthentication();

if (DEBUG) {
    error_log("Session data in accounts.php: " . print_r($_SESSION, true));
}

try {
    $db = db_connect();
    $userId = $_SESSION['auth']['id'];
    
    if (DEBUG) {
        error_log("Fetching accounts for user ID: " . $userId);
    }
    
    $result = fetchUserAccounts($db, $userId);
    $accounts = processAccountsData($result);
    
    echo json_encode(['success' => true, 'accounts' => $accounts]);
    
} catch (Exception $e) {
    if (DEBUG) {
        error_log("Error in accounts.php: " . $e->getMessage());
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error occurred']);
} finally {
    if (isset($db)) {
        $db->close();
    }
}
?> 
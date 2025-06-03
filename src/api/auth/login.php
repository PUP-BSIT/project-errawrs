<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

// Guard against non-POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Parse and validate input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Guard against missing required fields
if (!isset($data['password']) || !isset($data['login_type'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password and login type are required']);
    exit();
}

$loginType = strtolower(trim($data['login_type']));
$password = $data['password'];

// Guard against invalid login type
$validLoginTypes = ['admin', 'user', 'teller'];
if (!in_array($loginType, $validLoginTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid login type']);
    exit();
}

// Get identifier based on login type
$identifier = null;
if ($loginType === 'teller') {
    if (!isset($data['teller_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Teller number is required']);
        exit();
    }
    $identifier = trim($data['teller_number']);
} else {
    if (!isset($data['username'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Username is required']);
        exit();
    }
    $identifier = trim($data['username']);
}

// Validate identifier format
if ($loginType === 'teller' && strlen($identifier) < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid teller number format']);
    exit();
}

if ($loginType !== 'teller' && (strlen($identifier) < 3 || strlen($identifier) > 20)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid username format']);
    exit();
}

// Validate password length
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid password format']);
    exit();
}

try {
    $db = db_connect();
    
    // Prepare query based on login type
    $queries = [
        'admin' => [
            'table' => 'admin',
            'query' => 'SELECT admin_id as id, username, password_hash, first_name, last_name, email FROM admin WHERE username = ?'
        ],
        'teller' => [
            'table' => 'teller',
            'query' => 'SELECT teller_id as id, teller_number, password_hash, first_name, last_name, email FROM teller WHERE teller_number = ? AND status = "active"'
        ],
        'user' => [
            'table' => 'user',
            'query' => 'SELECT user_id as id, username, password_hash, first_name, last_name, phone_number FROM user WHERE username = ?'
        ]
    ];
    
    $queryData = $queries[$loginType];
    $stmt = $db->prepare($queryData['query']);
    
    if (!$stmt) {
        throw new Exception('Failed to prepare login query');
    }
    
    // Get user by identifier
    $stmt->bind_param('s', $identifier);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception($loginType === 'teller' ? 'Invalid teller number or password' : 'Invalid username or password');
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        throw new Exception($loginType === 'teller' ? 'Invalid teller number or password' : 'Invalid username or password');
    }
    
    // Get additional data for user type if needed
    $additionalData = [];
    if ($loginType === 'user') {
        $accountStmt = $db->prepare('SELECT account_id, account_number, balance, status FROM account WHERE user_id = ? AND status = "active"');
        $accountStmt->bind_param('i', $user['id']);
        $accountStmt->execute();
        $accountResult = $accountStmt->get_result();
        
        if ($accountResult->num_rows === 0) {
            throw new Exception('No active account found');
        }
        
        $additionalData['account'] = $accountResult->fetch_assoc();
    }
    
    // Remove sensitive data
    unset($user['password_hash']);
    
    // Store session data
    $_SESSION['auth'] = [
        'id' => $user['id'],
        'identifier' => $loginType === 'teller' ? $user['teller_number'] : $user['username'],
        'type' => $loginType,
        'logged_in_at' => time(),
        'last_activity' => time(),
        'first_name' => $user['first_name'] ?? '',
        'last_name' => $user['last_name'] ?? '',
        'phone_number' => $user['phone_number'] ?? null,
        'email' => $user['email'] ?? null
    ];
    
    // Add account data to session for users
    if ($loginType === 'user') {
        $_SESSION['auth']['account'] = [
            'account_id' => $additionalData['account']['account_id'],
            'account_number' => $additionalData['account']['account_number'],
            'balance' => $additionalData['account']['balance']
        ];
    }
    
    // Prepare response
    $response = [
        'success' => true,
        'message' => 'Login successful',
        'type' => $loginType,
        'user' => $user
    ];
    
    // Add additional data to response if available
    if (!empty($additionalData)) {
        $response = array_merge($response, $additionalData);
    }
    
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
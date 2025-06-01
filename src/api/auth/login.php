<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate required fields based on login type
if (!isset($data['password']) || !isset($data['login_type'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password and login type are required']);
    exit();
}

$loginType = strtolower(trim($data['login_type'])); // admin, user, or teller

// Check for required fields based on login type
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

$password = $data['password'];

// Validate login type
$validLoginTypes = ['admin', 'user', 'teller'];
if (!in_array($loginType, $validLoginTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid login type']);
    exit();
}

// Validate input lengths based on login type
if ($loginType === 'teller') {
    if (strlen($identifier) < 1) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid teller number format']);
        exit();
    }
} else {
    if (strlen($identifier) < 3 || strlen($identifier) > 20) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid username format']);
        exit();
    }
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid password format']);
    exit();
}

try {
    $db = db_connect();
    
    switch ($loginType) {
        case 'admin':
            $table = 'admin';
            $stmt = $db->prepare('SELECT admin_id as id, username, password_hash, first_name, last_name, email FROM admin WHERE username = ?');
            break;
            
        case 'teller':
            $table = 'teller';
            $stmt = $db->prepare('SELECT teller_id as id, teller_number, password_hash, first_name, last_name, email FROM teller WHERE teller_number = ?');
            break;
            
        case 'user':
            $table = 'user';
            $stmt = $db->prepare('SELECT user_id as id, username, password_hash, first_name, last_name, phone_number FROM user WHERE username = ?');
            break;
            
        default:
            throw new Exception('Invalid login type');
    }
    
    // Get user by identifier (username or teller_number)
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
    
    // Additional data fetching based on login type
    $additionalData = [];
    
    if ($loginType === 'user') {
        // Get user's account information
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
        'logged_in_at' => time()
    ];
    
    // Merge additional data based on login type
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
<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/error.log');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

// Set headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Allow-Credentials: true');

// Ensure no output before headers
ob_start();

// Enhanced error handling for development
function handleError($message, $code = 400, $logError = true) {
    if ($logError) {
        error_log("Login API Error: " . $message);
    }
    
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Guard against non-POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    handleError('Method not allowed', 405);
}

try {
    // Test database connection first
    $db = db_connect();
    if (!$db) {
        throw new Exception('Database connection failed');
}

// Parse and validate input
$input = file_get_contents('php://input');
if (empty($input)) {
    handleError('No input data received');
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    handleError('Invalid JSON data: ' . json_last_error_msg());
}

    // Log received data for debugging
    error_log("Received login data: " . print_r($data, true));

// Guard against missing required fields
if (!isset($data['password']) || !isset($data['login_type'])) {
    handleError('Password and login type are required');
}

$loginType = strtolower(trim($data['login_type']));
$password = $data['password'];

// Guard against invalid login type
$validLoginTypes = ['admin', 'user', 'teller'];
if (!in_array($loginType, $validLoginTypes)) {
    handleError('Invalid login type');
}

// Get identifier based on login type
$identifier = null;
if ($loginType === 'teller') {
    if (!isset($data['teller_number'])) {
        handleError('Teller number is required');
    }
    $identifier = trim($data['teller_number']);
} else {
    if (!isset($data['username'])) {
        handleError('Username is required');
    }
    $identifier = trim($data['username']);
}

// Enhanced validation
if (empty($identifier)) {
    handleError($loginType === 'teller' ? 'Teller number cannot be empty' : 'Username cannot be empty');
}

if ($loginType === 'teller') {
    // More flexible teller number validation
    if (strlen($identifier) < 1 || strlen($identifier) > 50) {
        handleError('Invalid teller number format');
    }
} else {
    // Username validation
    if (strlen($identifier) < 3 || strlen($identifier) > 50) {
        handleError('Username must be between 3 and 50 characters');
    }
}

// Validate password length
if (strlen($password) < 8) {
    handleError('Password must be at least 8 characters long');
    }

    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        handleError('Invalid JSON data: ' . json_last_error_msg());
    }

    // Log received data for debugging
    error_log("Received login data: " . print_r($data, true));

    // Guard against missing required fields
    if (!isset($data['password']) || !isset($data['login_type'])) {
        handleError('Password and login type are required');
    }

    $loginType = strtolower(trim($data['login_type']));
    $password = $data['password'];

    // Guard against invalid login type
    $validLoginTypes = ['admin', 'user', 'teller'];
    if (!in_array($loginType, $validLoginTypes)) {
        handleError('Invalid login type');
    }

    // Get identifier based on login type
    $identifier = null;
    if ($loginType === 'teller') {
        if (!isset($data['teller_number'])) {
            handleError('Teller number is required');
        }
        $identifier = trim($data['teller_number']);
    } else {
        if (!isset($data['username'])) {
            handleError('Username is required');
        }
        $identifier = trim($data['username']);
    }

    // Enhanced validation
    if (empty($identifier)) {
        handleError($loginType === 'teller' ? 'Teller number cannot be empty' : 'Username cannot be empty');
    }

    if ($loginType === 'teller') {
        // More flexible teller number validation
        if (strlen($identifier) < 1 || strlen($identifier) > 50) {
            handleError('Invalid teller number format');
        }
    } else {
        // Username validation
        if (strlen($identifier) < 3 || strlen($identifier) > 50) {
            handleError('Username must be between 3 and 50 characters');
        }
    }

    // Validate password length
    if (strlen($password) < 8) {
        handleError('Password must be at least 8 characters long');
    }

    // Prepare query based on login type
    $queries = [
        'admin' => [
            'table' => 'admin',
            'query' => 'SELECT admin_id as id, username, password_hash, first_name, last_name, email FROM admin WHERE username = ? LIMIT 1'
        ],
        'teller' => [
            'table' => 'teller',
            'query' => 'SELECT teller_id as id, teller_number, password_hash, first_name, last_name, email, status FROM teller WHERE teller_number = ? LIMIT 1'
        ],
        'user' => [
            'table' => 'user',
            'query' => 'SELECT user_id as id, username, password_hash, first_name, last_name, phone_number FROM user WHERE username = ? LIMIT 1'
        ]
    ];
    
    $queryData = $queries[$loginType];
    $stmt = $db->prepare($queryData['query']);
    
    if (!$stmt) {
        throw new Exception('Failed to prepare login query: ' . $db->error);
    }
    
    // Get user by identifier
    $stmt->bind_param('s', $identifier);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to execute login query: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $errorMsg = $loginType === 'teller' ? 'Invalid teller number or password' : 'Invalid username or password';
        handleError($errorMsg, 401, false);
    }
    
    $user = $result->fetch_assoc();
    
    // For tellers, check if account is active
    if ($loginType === 'teller' && isset($user['status']) && $user['status'] !== 'active') {
        handleError('Teller account is inactive. Please contact administrator.', 401);
    }
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        $errorMsg = $loginType === 'teller' ? 'Invalid teller number or password' : 'Invalid username or password';
        handleError($errorMsg, 401, false);
    }
    
    // Get additional data for user type if needed
    $additionalData = [];
    if ($loginType === 'user') {
        $accountStmt = $db->prepare('SELECT account_id, account_number, balance, status FROM account WHERE user_id = ? AND status = "active" LIMIT 1');
        if (!$accountStmt) {
            throw new Exception('Failed to prepare account query');
        }
        
        $accountStmt->bind_param('i', $user['id']);
        $accountStmt->execute();
        $accountResult = $accountStmt->get_result();
        
        if ($accountResult->num_rows === 0) {
            handleError('No active account found', 401);
        }
        
        $additionalData['account'] = $accountResult->fetch_assoc();
        $accountStmt->close();
    }
    
    // Remove sensitive data
    unset($user['password_hash']);
    
    // Initialize session manager and create session
    $sessionManager = SessionManager::getInstance();
    
    // Create new session (this will handle cleanup of old session internally)
    $sessionManager->createSession($user, $loginType);
    
    if ($loginType === 'user' && !empty($additionalData['account'])) {
        $_SESSION['auth']['account'] = [
            'account_id' => $additionalData['account']['account_id'],
            'account_number' => $additionalData['account']['account_number'],
            'balance' => $additionalData['account']['balance']
        ];
    }
    
    // Update last activity time
    $sessionManager->updateActivity();
    
    // Prepare response
    $response = [
        'success' => true,
        'message' => 'Login successful',
        'type' => $loginType,
        'user' => $user
    ];
    
    if (!empty($additionalData)) {
        $response = array_merge($response, $additionalData);
    }
    
    // Set proper success status and return response
    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    error_log("Login Exception: " . $e->getMessage());
    handleError($e->getMessage(), 500);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($db)) {
        $db->close();
    }
}

// Flush output buffer before exit
ob_end_flush();
?>
<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

// Enhanced CORS headers - more flexible for development
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';

// Allow common local development origins
$allowedOrigins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:8080'
];

// Check if the request origin is in allowed list
$allowOrigin = '*';
foreach ($allowedOrigins as $allowed) {
    if (strpos($origin, $allowed) === 0) {
        $allowOrigin = $origin;
        break;
    }
}

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: $allowOrigin");
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Guard against non-POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

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

// Parse and validate input
$input = file_get_contents('php://input');
if (empty($input)) {
    handleError('No input data received');
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    handleError('Invalid JSON data: ' . json_last_error_msg());
}

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

try {
    // Test database connection first
    $db = db_connect();
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Test database connectivity
    if (!$db->ping()) {
        throw new Exception('Database is not responding');
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
        // Use generic error message for security
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
    if ($loginType === 'user' && !empty($additionalData['account'])) {
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
        'user' => $user,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    // Add additional data to response if available
    if (!empty($additionalData)) {
        $response = array_merge($response, $additionalData);
    }
    
    // Set proper success status
    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Don't reveal internal errors in production
    $errorMessage = $e->getMessage();
    if (strpos($errorMessage, 'Database') !== false || strpos($errorMessage, 'SQL') !== false) {
        $errorMessage = 'Database connection error. Please contact administrator.';
    }
    
    handleError($errorMessage, 500);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($db)) {
        $db->close();
    }
}
?>
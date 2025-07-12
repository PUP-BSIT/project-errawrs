<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

define('DEBUG', true);
define('MIN_USERNAME_LENGTH', 3);
define('MAX_USERNAME_LENGTH', 50);
define('MIN_PASSWORD_LENGTH', 8);
define('MAX_TELLER_NUMBER_LENGTH', 50);

function isLocalEnvironment() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return strpos($host, 'localhost') !== false || 
           strpos($host, '127.0.0.1') !== false ||
           strpos($host, '[::1]') !== false;
}

function setEnvironmentHeaders() {
    if (isLocalEnvironment()) {
        header('Access-Control-Allow-Origin: http://localhost');
    } else {
        header('Access-Control-Allow-Origin: https://stackovercash.site, ' .
               'https://dev-teller.stackovercash.site');
    }
    
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization');
    header('Access-Control-Allow-Credentials: true');
}

function handleError($message, $code = 400, $logError = true) {
    if ($logError && DEBUG) {
        error_log("Login API Error: " . $message);
    }
    
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'environment' => isLocalEnvironment() ? 'local' : 'production'
    ]);
    exit();
}

function validateHttpMethod() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed',
            'allowed_methods' => ['POST', 'OPTIONS']
        ]);
        exit();
    }
}

function getInputData() {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        handleError('No input data received');
    }

    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        handleError('Invalid JSON data: ' . json_last_error_msg());
    }

    if (DEBUG) {
        error_log("Received login data: " . print_r($data, true));
    }

    return $data;
}

function validateRequiredFields($data) {
    if (!isset($data['password']) || !isset($data['login_type'])) {
        handleError('Password and login type are required');
    }
}

function validateLoginType($loginType) {
    $validLoginTypes = ['admin', 'user', 'teller'];
    if (!in_array($loginType, $validLoginTypes)) {
        handleError('Invalid login type');
    }
}

function getIdentifier($data, $loginType) {
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

    if (empty($identifier)) {
        $errorMsg = $loginType === 'teller' ? 
            'Teller number cannot be empty' : 'Username cannot be empty';
        handleError($errorMsg);
    }

    return $identifier;
}

function validateIdentifier($identifier, $loginType) {
    if ($loginType === 'teller') {
        if (strlen($identifier) < 1 || 
            strlen($identifier) > MAX_TELLER_NUMBER_LENGTH) {
            handleError('Invalid teller number format');
        }
    } else {
        if (strlen($identifier) < MIN_USERNAME_LENGTH || 
            strlen($identifier) > MAX_USERNAME_LENGTH) {
            handleError('Username must be between 3 and 50 characters');
        }
    }
}

function validatePassword($password) {
    if (strlen($password) < MIN_PASSWORD_LENGTH) {
        handleError('Password must be at least 8 characters long');
    }
}

function getLoginQueries() {
    return [
        'admin' => [
            'table' => 'admin',
            'query' => 'SELECT admin_id as id, username, password_hash, ' .
                      'first_name, last_name, email FROM admin WHERE username = ? LIMIT 1'
        ],
        'teller' => [
            'table' => 'teller',
            'query' => 'SELECT teller_id as id, teller_number, password_hash, ' .
                      'first_name, last_name, email, status FROM teller ' .
                      'WHERE teller_number = ? LIMIT 1'
        ],
        'user' => [
            'table' => 'user',
            'query' => 'SELECT user_id as id, username, password_hash, ' .
                      'first_name, last_name, phone_number FROM user ' .
                      'WHERE username = ? LIMIT 1'
        ]
    ];
}

function authenticateUser($db, $query, $identifier) {
    $stmt = $db->prepare($query);
    
    if (!$stmt) {
        throw new Exception('Failed to prepare login query: ' . $db->error);
    }
    
    $stmt->bind_param('s', $identifier);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to execute login query: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        return null;
    }
    
    return $result->fetch_assoc();
}

function validateTellerStatus($user) {
    if (isset($user['status']) && $user['status'] !== 'active') {
        handleError('Teller account is inactive. Please contact administrator.', 401);
    }
}

function verifyPassword($password, $user) {
    if (!password_verify($password, $user['password_hash'])) {
        return false;
    }
    return true;
}

function getUserAccount($db, $userId) {
    $accountQuery = $db->prepare(
        'SELECT account_id, account_number, balance, status FROM account ' .
        'WHERE user_id = ? AND status = "active" LIMIT 1'
    );
    
    if (!$accountQuery) {
        throw new Exception('Failed to prepare account query');
    }
    
    $accountQuery->bind_param('i', $userId);
    $accountQuery->execute();
    $accountResult = $accountQuery->get_result();
    
    if ($accountResult->num_rows === 0) {
        handleError('No active account found', 401);
    }
    
    $account = $accountResult->fetch_assoc();
    $accountQuery->close();
    
    return $account;
}

function createUserSession($user, $loginType, $additionalData = []) {
    $sessionManager = SessionManager::getInstance();
    $sessionManager->createSession($user, $loginType);
    
    if ($loginType === 'admin') {
        $_SESSION['adminInfo'] = $user;
    } elseif ($loginType === 'teller') {
        $_SESSION['tellerInfo'] = $user;
    } elseif ($loginType === 'user') {
        $_SESSION['userInfo'] = array_merge($user, $additionalData);
    }

    $sessionManager->updateActivity();
}

function prepareSuccessResponse($user, $loginType, $additionalData = []) {
    return [
        'success' => true,
        'message' => 'Login successful',
        'user' => array_merge($user, $additionalData),
        'login_type' => $loginType,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

setEnvironmentHeaders();
validateHttpMethod();

try {
    $db = db_connect();
    if (!$db) {
        throw new Exception('Database connection failed');
    }

    $data = getInputData();
    validateRequiredFields($data);

    $loginType = strtolower(trim($data['login_type']));
    $password = $data['password'];

    validateLoginType($loginType);
    $identifier = getIdentifier($data, $loginType);
    validateIdentifier($identifier, $loginType);
    validatePassword($password);

    $queries = getLoginQueries();
    $queryData = $queries[$loginType];
    
    $user = authenticateUser($db, $queryData['query'], $identifier);
    
    if (!$user) {
        $errorMsg = $loginType === 'teller' ? 
            'Invalid teller number or password' : 'Invalid username or password';
        handleError($errorMsg, 401, false);
    }

    if ($loginType === 'teller') {
        validateTellerStatus($user);
    }

    if (!verifyPassword($password, $user)) {
        $errorMsg = $loginType === 'teller' ? 
            'Invalid teller number or password' : 'Invalid username or password';
        handleError($errorMsg, 401, false);
    }

    $additionalData = [];
    if ($loginType === 'user') {
        $additionalData['account'] = getUserAccount($db, $user['id']);
    }

    unset($user['password_hash']);

    createUserSession($user, $loginType, $additionalData);

    $responseData = prepareSuccessResponse($user, $loginType, $additionalData);

    if (DEBUG) {
        error_log("Login successful. Response data: " . print_r($responseData, true));
        error_log("Session data after login: " . print_r($_SESSION, true));
    }

    http_response_code(200);
    echo json_encode($responseData);

} catch (Exception $e) {
    if (DEBUG) {
        error_log("Login Exception: " . $e->getMessage());
    }
    handleError($e->getMessage(), 500);
} finally {
    if (isset($db)) {
        $db->close();
    }
}
?>
<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';

$session = SessionManager::getInstance();
$session->initSession();

header('Content-Type: application/json');

if (!$session->isAuthenticated() || !isset($_SESSION['auth']['type']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['auth']['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
    exit();
}

$first_name = $data['first_name'] ?? null;
$last_name = $data['last_name'] ?? null;
$phone_number = $data['phone_number'] ?? null;
$password = $data['password'] ?? null;
$current_password = $data['current_password'] ?? null;

if (empty($first_name) || empty($last_name) || empty($phone_number)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'First name, last name, and phone number are required.']);
    exit();
}

if (empty($current_password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Current password is required for confirmation.']);
    exit();
}

try {
    $conn = db_connect();

    // Fetch the current password hash from the database
    $stmt = $conn->prepare('SELECT password_hash FROM user WHERE user_id = ?');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $stmt->bind_result($password_hash_db);
    $stmt->fetch();
    $stmt->close();

    if (!$password_hash_db || !password_verify($current_password, $password_hash_db)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Current password is incorrect.']);
        exit();
    }

    $fields_to_update = [
        'first_name' => $first_name,
        'last_name' => $last_name,
        'phone_number' => $phone_number
    ];
    
    $types = 'sss'; 
    $params = [$first_name, $last_name, $phone_number];

    if (!empty($password)) {
        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        $fields_to_update['password_hash'] = $password_hash;
        $types = 'ssss';
        $params = [$first_name, $last_name, $phone_number, $password_hash];
    }
    
    $query_parts = [];
    foreach ($fields_to_update as $field => $value) {
        $query_parts[] = "{$field} = ?";
    }

    $query = "UPDATE user SET " . implode(', ', $query_parts) . " WHERE user_id = ?";
    
    $params[] = $user_id;
    $types .= 'i';

    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        $_SESSION['auth']['first_name'] = $first_name;
        $_SESSION['auth']['last_name'] = $last_name;
        $_SESSION['auth']['phone_number'] = $phone_number;

        if(isset($_SESSION['userInfo'])) {
            $_SESSION['userInfo']['first_name'] = $first_name;
            $_SESSION['userInfo']['last_name'] = $last_name;
            $_SESSION['userInfo']['phone_number'] = $phone_number;
        }

        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully'
        ]);
    } else {
        throw new Exception("Failed to update profile: " . $stmt->error);
    }
} catch (Exception $e) {
    error_log("Error updating profile for user {$user_id}: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'An error occurred while updating your profile.'
    ]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
?> 
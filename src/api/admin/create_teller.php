<?php
session_start();

// Prevent any HTML error output
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set JSON header first before any output
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Function to handle errors
function sendError($message, $code = 400) {
    error_log("Create Teller Error: " . $message);
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

try {
    require_once '../../config/database.php';
} catch (Exception $e) {
    sendError('Configuration error: ' . $e->getMessage(), 500);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

// Verify admin is logged in
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'admin') {
    sendError('Unauthorized access', 401);
}

// Get and validate input data
$input = file_get_contents("php://input");
if (!$input) {
    sendError('No input data received');
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendError('Invalid JSON: ' . json_last_error_msg());
}

if (!isset($data['first_name']) || !isset($data['last_name']) || !isset($data['email']) || !isset($data['password'])) {
    sendError('Missing required fields');
}

// Validate email format
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    sendError('Invalid email format');
}

try {
    // Get database connection
    $conn = db_connect();

    // Check if email already exists
    $stmt = $conn->prepare("SELECT teller_id FROM teller WHERE email = ?");
    if (!$stmt) {
        throw new Exception($conn->error);
    }
    
    $stmt->bind_param("s", $data['email']);
    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        sendError('Email already exists');
    }

    // Generate teller number
    $stmt = $conn->prepare("SELECT MAX(CAST(SUBSTRING(teller_number, 2) AS UNSIGNED)) as max_num FROM teller WHERE teller_number LIKE 'T%'");
    if (!$stmt) {
        throw new Exception($conn->error);
    }
    
    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $next_num = ($row['max_num'] ?? 0) + 1;
    $teller_number = sprintf("T%06d", $next_num);

    // Hash password
    $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);

    // Insert new teller
    $stmt = $conn->prepare("INSERT INTO teller (teller_number, password_hash, first_name, last_name, email, status) VALUES (?, ?, ?, ?, ?, 'active')");
    if (!$stmt) {
        throw new Exception($conn->error);
    }
    
    $stmt->bind_param("sssss", 
        $teller_number,
        $password_hash,
        $data['first_name'],
        $data['last_name'],
        $data['email']
    );

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    $teller_id = $conn->insert_id;
    
    // Return success response
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Teller created successfully',
        'teller' => [
            'teller_id' => $teller_id,
            'teller_number' => $teller_number,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'status' => 'active'
        ]
    ]);

    // Close database connection
    db_close($conn);

} catch (Exception $e) {
    error_log("Create Teller Exception: " . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500);
} 
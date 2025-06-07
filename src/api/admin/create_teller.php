<?php
session_start();

// Prevent any HTML error output
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set JSON header first before any output
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to handle errors
function sendError($message, $code = 400) {
    error_log("Create Teller Error: " . $message);
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

// Function to validate input
function validateInput($data) {
    $errors = [];
    
    // Validate first name
    if (empty($data['first_name']) || strlen($data['first_name']) > 50) {
        $errors[] = "First name is required and must be less than 50 characters";
    }
    
    // Validate last name
    if (empty($data['last_name']) || strlen($data['last_name']) > 50) {
        $errors[] = "Last name is required and must be less than 50 characters";
    }
    
    // Validate email
    if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Valid email address is required";
    }
    
    // Validate password
    if (empty($data['password'])) {
        $errors[] = "Password is required";
    } else {
        if (strlen($data['password']) < 8) {
            $errors[] = "Password must be at least 8 characters long";
        }
        if (!preg_match('/[A-Z]/', $data['password'])) {
            $errors[] = "Password must contain at least one uppercase letter";
        }
        if (!preg_match('/[a-z]/', $data['password'])) {
            $errors[] = "Password must contain at least one lowercase letter";
        }
        if (!preg_match('/[0-9]/', $data['password'])) {
            $errors[] = "Password must contain at least one number";
        }
    }
    
    return $errors;
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

// Validate input data
$validationErrors = validateInput($data);
if (!empty($validationErrors)) {
    sendError(implode(", ", $validationErrors));
}

try {
    // Get database connection
    $conn = db_connect();
    
    // Start transaction
    $conn->begin_transaction();

    try {
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
            throw new Exception('Email already exists');
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
        
        // Commit transaction
        $conn->commit();
        
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

    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    } finally {
        // Close database connection
        db_close($conn);
    }

} catch (Exception $e) {
    error_log("Create Teller Exception: " . $e->getMessage());
    sendError($e->getMessage(), 500);
} 
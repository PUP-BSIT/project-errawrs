<?php
// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db_config.php';
require_once '../../utils/jwt_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get database connection
    $conn = getDBConnection();

    // Get input
    $data = json_decode(file_get_contents('php://input'), true);
    $teller_number = isset($data['teller_number']) ? (int)$data['teller_number'] : 0;
    $password = isset($data['password']) ? $data['password'] : '';

    // Validate input
    if (empty($teller_number) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Teller number and password are required.']);
        exit();
    }

    // Prepare and execute query using prepared statement
    $sql = "SELECT teller_number, first_name, last_name, email, password_hash, status 
            FROM teller 
            WHERE teller_number = ? AND status = 'active'";
            
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        throw new Exception('Failed to prepare statement: ' . mysqli_error($conn));
    }

    mysqli_stmt_bind_param($stmt, "i", $teller_number);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    if (!$result || mysqli_num_rows($result) !== 1) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid teller number or password.']);
        exit();
    }

    $teller = mysqli_fetch_assoc($result);

    // Verify password
    if (!password_verify($password, $teller['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid teller number or password.']);
        exit();
    }

    // Check if teller is active
    if ($teller['status'] !== 'active') {
        http_response_code(403);
        echo json_encode(['error' => 'Your account is not active. Please contact the administrator.']);
        exit();
    }

    // Update last login timestamp
    $update_sql = "UPDATE teller SET last_login = NOW() WHERE teller_number = ?";
    $update_stmt = mysqli_prepare($conn, $update_sql);
    mysqli_stmt_bind_param($update_stmt, "i", $teller_number);
    mysqli_stmt_execute($update_stmt);

    // Generate JWT token
    $token = JWTHelper::generateToken($teller);

    // Success: return teller details and token
    $response = [
        'teller_number' => $teller['teller_number'],
        'first_name' => $teller['first_name'],
        'last_name' => $teller['last_name'],
        'email' => $teller['email'],
        'status' => $teller['status']
    ];

    echo json_encode([
        'success' => true,
        'token' => $token,
        'teller' => $response
    ]);

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'An error occurred during login. Please try again later.']);
} finally {
    // Clean up
    if (isset($stmt)) {
        mysqli_stmt_close($stmt);
    }
    if (isset($update_stmt)) {
        mysqli_stmt_close($update_stmt);
    }
    if (isset($conn)) {
        mysqli_close($conn);
    }
} 
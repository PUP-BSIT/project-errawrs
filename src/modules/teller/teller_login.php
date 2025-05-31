<?php
// Enable CORS for localhost development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once '../../config/db_config.php';

// Add error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
    $teller_number = isset($data['teller_number']) ? trim($data['teller_number']) : '';
    $password = isset($data['password']) ? $data['password'] : '';

    // Validate input
    if (empty($teller_number) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Teller number and password are required.']);
        exit();
    }

    try {
        // Get teller details
        $teller_sql = "SELECT teller_id, teller_number, password_hash, first_name, last_name 
                       FROM teller 
                       WHERE teller_number = ?";
        $teller_stmt = mysqli_prepare($conn, $teller_sql);
        mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
        mysqli_stmt_execute($teller_stmt);
        $teller_result = mysqli_stmt_get_result($teller_stmt);

        if (mysqli_num_rows($teller_result) !== 1) {
            // Use a generic error message for security
            throw new Exception('Invalid credentials.');
        }

        $teller = mysqli_fetch_assoc($teller_result);

        // Verify password
        if (!password_verify($password, $teller['password_hash'])) {
            // Use a generic error message for security
            throw new Exception('Invalid credentials.');
        }

        // Generate session token (you might want to use JWT or other token mechanism)
        $session_token = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+8 hours')); // 8-hour session

        // Success response (remove sensitive data)
        $response = [
            'success' => true,
            'message' => 'Login successful',
            'teller' => [
                'teller_number' => $teller['teller_number'],
                'first_name' => $teller['first_name'],
                'last_name' => $teller['last_name']
            ],
            'session' => [
                'token' => $session_token,
                'expires_at' => $expiry
            ]
        ];

        // Log successful login attempt (optional)
        error_log("Successful login for teller: " . $teller['teller_number']);

        echo json_encode($response);

    } catch (Exception $e) {
        // Add a small delay on failure to prevent timing attacks
        sleep(1);
        throw $e;
    }

} catch (Exception $e) {
    error_log("Login error for teller " . $teller_number . ": " . $e->getMessage());
    http_response_code(401);
    echo json_encode(['error' => $e->getMessage()]);
} finally {
    // Clean up
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    
    // Close connection
    if (isset($conn)) {
        mysqli_close($conn);
    }
} 
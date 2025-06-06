<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Enable CORS for localhost development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once '../../config/database.php';

try {
    // Get database connection
    $conn = db_connect();

    // Get teller number from request
    $teller_number = isset($_GET['teller_number']) ? trim($_GET['teller_number']) : '';

    if (empty($teller_number)) {
        throw new Exception('Teller number is required');
    }

    // Get teller information
    $stmt = mysqli_prepare($conn, "
        SELECT first_name, last_name, email as email_address, status
        FROM teller 
        WHERE teller_number = ? AND status = 'active'
    ");

    mysqli_stmt_bind_param($stmt, 's', $teller_number);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    if (mysqli_num_rows($result) === 0) {
        throw new Exception('Teller not found or inactive');
    }

    $teller = mysqli_fetch_assoc($result);

    // Format the response to match the UI
    $response = [
        'success' => true,
        'first_name' => $teller['first_name'],
        'last_name' => $teller['last_name'],
        'email_address' => $teller['email_address'],
        'status' => $teller['status']
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("View Profile Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        mysqli_close($conn);
    }
} 
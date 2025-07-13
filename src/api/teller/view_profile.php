<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Enable CORS for localhost development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once __DIR__ . '/../../config/database.php';

try {
    // Get database connection
    $conn = db_connect();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // GET method - View profile
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

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // PUT method - Update profile
        $input = json_decode(file_get_contents('php://input'), true);
        
        $teller_number = isset($input['teller_number']) ? trim($input['teller_number']) : '';
        $first_name = isset($input['first_name']) ? trim($input['first_name']) : '';
        $last_name = isset($input['last_name']) ? trim($input['last_name']) : '';
        $email = isset($input['email_address']) ? trim($input['email_address']) : '';

        if (empty($teller_number)) {
            throw new Exception('Teller number is required');
        }

        if (empty($first_name) || empty($last_name) || empty($email)) {
            throw new Exception('First name, last name, and email are required');
        }

        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }

        // Check if teller exists and is active
        $check_stmt = mysqli_prepare($conn, "
            SELECT teller_number FROM teller 
            WHERE teller_number = ? AND status = 'active'
        ");
        mysqli_stmt_bind_param($check_stmt, 's', $teller_number);
        mysqli_stmt_execute($check_stmt);
        $check_result = mysqli_stmt_get_result($check_stmt);

        if (mysqli_num_rows($check_result) === 0) {
            throw new Exception('Teller not found or inactive');
        }

        // Check if email is already taken by another teller
        $email_check_stmt = mysqli_prepare($conn, "
            SELECT teller_number FROM teller 
            WHERE email = ? AND teller_number != ?
        ");
        mysqli_stmt_bind_param($email_check_stmt, 'ss', $email, $teller_number);
        mysqli_stmt_execute($email_check_stmt);
        $email_check_result = mysqli_stmt_get_result($email_check_stmt);

        if (mysqli_num_rows($email_check_result) > 0) {
            throw new Exception('Email address is already taken by another teller');
        }

        // Update teller profile
        $update_stmt = mysqli_prepare($conn, "
            UPDATE teller 
            SET first_name = ?, last_name = ?, email = ?
            WHERE teller_number = ?
        ");
        mysqli_stmt_bind_param($update_stmt, 'ssss', $first_name, $last_name, $email, $teller_number);
        
        if (!mysqli_stmt_execute($update_stmt)) {
            throw new Exception('Failed to update profile');
        }

        if (mysqli_affected_rows($conn) === 0) {
            throw new Exception('No changes made to profile');
        }

        $response = [
            'success' => true,
            'message' => 'Profile updated successfully',
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email_address' => $email
        ];

        echo json_encode($response);
    } else {
        throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    error_log("Profile Error: " . $e->getMessage());
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
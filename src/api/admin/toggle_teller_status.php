<?php
require_once __DIR__ . '/../../config/SessionManager.php';

$session = SessionManager::getInstance();

// Enable error display for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set JSON header first before any output
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Function to handle errors
function sendError($message, $code = 400, $details = null) {
    error_log("Toggle Teller Status Error: " . $message);
    http_response_code($code);
    $response = ['success' => false, 'message' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    echo json_encode($response);
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
if (!$session->isAuthorizedAdmin()) {
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

if (!isset($data['teller_id'])) {
    sendError('Missing teller ID');
}

try {
    // Get database connection
    $conn = db_connect();

    // Get current status
    $stmt = $conn->prepare("SELECT status FROM teller WHERE teller_id = ?");
    if (!$stmt) {
        throw new Exception($conn->error);
    }
    
    $stmt->bind_param("i", $data['teller_id']);
    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }
    
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        sendError('Teller not found', 404);
    }
    
    $row = $result->fetch_assoc();
    $new_status = $row['status'] === 'active' ? 'inactive' : 'active';

    // Update status
    $stmt = $conn->prepare("UPDATE teller SET status = ? WHERE teller_id = ?");
    if (!$stmt) {
        throw new Exception($conn->error);
    }
    
    $stmt->bind_param("si", $new_status, $data['teller_id']);
    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Teller status updated successfully',
        'status' => $new_status
    ]);

    // Close database connection
    db_close($conn);

} catch (Exception $e) {
    error_log("Toggle Teller Status Exception: " . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500, [
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
} 
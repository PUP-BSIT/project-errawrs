<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

// Set headers
header('Content-Type: application/json');

// Check if user is logged in and is a teller
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'teller') {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized access'
    ]);
    exit();
}

try {
    // Get teller ID from session
    $tellerId = $_SESSION['auth']['id'];
    
    // Connect to database
    $db = db_connect();
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Prepare query to get latest teller information
    $query = "SELECT 
                teller_number,
                first_name,
                last_name,
                email as email_address,
                status
              FROM teller 
              WHERE teller_id = ? 
              LIMIT 1";
              
    $stmt = $db->prepare($query);
    if (!$stmt) {
        throw new Exception('Failed to prepare query: ' . $db->error);
    }
    
    // Bind teller ID and execute
    $stmt->bind_param('i', $tellerId);
    if (!$stmt->execute()) {
        throw new Exception('Failed to execute query: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception('Teller not found');
    }
    
    // Fetch teller data
    $tellerData = $result->fetch_assoc();
    
    // Return success response with teller data
    echo json_encode([
        'success' => true,
        'message' => 'Profile loaded successfully',
        ...$tellerData
    ]);

} catch (Exception $e) {
    error_log("Profile fetch error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to load profile. Please try again later.'
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($db)) {
        $db->close();
    }
}
?> 
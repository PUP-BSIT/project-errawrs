<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['auth']['id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['auth']['id'];

// Check if this is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Get the POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
    exit();
}

// Validate required fields
$required_fields = ['first_name', 'last_name', 'email'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Missing required field: {$field}"]);
        exit();
    }
}

// Optional fields with validation
$phone = isset($data['phone']) ? $data['phone'] : null;
$address = isset($data['address']) ? $data['address'] : null;

try {
    $conn = db_connect();
    
    // Update the user profile
    $query = "UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ? WHERE user_id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('sssssi', $data['first_name'], $data['last_name'], $data['email'], $phone, $address, $user_id);
    
    if ($stmt->execute()) {
        // Update session data
        $_SESSION['auth']['first_name'] = $data['first_name'];
        $_SESSION['auth']['last_name'] = $data['last_name'];
        $_SESSION['auth']['email'] = $data['email'];
        if ($phone) $_SESSION['auth']['phone'] = $phone;
        if ($address) $_SESSION['auth']['address'] = $address;
        
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'phone' => $phone,
                'address' => $address
            ]
        ]);
    } else {
        throw new Exception("Failed to update profile: " . $stmt->error);
    }
} catch (Exception $e) {
    error_log("Error updating profile: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'An error occurred while updating your profile'
    ]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
?> 
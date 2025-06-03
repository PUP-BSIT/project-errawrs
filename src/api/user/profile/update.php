<?php
session_start();
require_once __DIR__ . '/../../../config/database.php'; // Adjust path as needed

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['auth']['id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['auth']['id'];

// Check if the request method is POST or PUT (depending on frontend)
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate required fields (at least the ones that can be updated)
if (!isset($data['first_name'], $data['last_name'], $data['username'], $data['phone_number'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit();
}

try {
    $conn = db_connect();
    
    // Start transaction
    $conn->begin_transaction();

    // Build update query dynamically based on provided fields
    $updateFields = [];
    $params = [];
    $types = '';

    if (isset($data['first_name'])) { $updateFields[] = 'first_name = ?'; $params[] = $data['first_name']; $types .= 's'; }
    if (isset($data['last_name'])) { $updateFields[] = 'last_name = ?'; $params[] = $data['last_name']; $types .= 's'; }
    if (isset($data['username'])) { 
        // Optional: Add a check for unique username if updating username
        $updateFields[] = 'username = ?'; $params[] = $data['username']; $types .= 's'; 
    }
    if (isset($data['phone_number'])) { 
         // Optional: Add a check for unique phone number if updating
         $updateFields[] = 'phone_number = ?'; $params[] = $data['phone_number']; $types .= 's'; 
    }
    
    // Handle password update if provided
    if (isset($data['password']) && !empty($data['password'])) {
        $password = $data['password'];
        // Add password complexity validation here (align with registration rules)
        // Password must be at least 8 characters with uppercase, lowercase, and number
        if (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters long and include uppercase, lowercase, and number.']);
            exit();
        }
        
        $updateFields[] = 'password_hash = ?';
        $params[] = password_hash($password, PASSWORD_DEFAULT);
        $types .= 's';
    }

    // Ensure there is at least one field to update
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields provided for update']);
        exit();
    }

    // Add user_id to parameters for the WHERE clause
    $params[] = $user_id;
    $types .= 'i';
    
    // Construct and execute update query
    $query = 'UPDATE user SET ' . implode(', ', $updateFields) . ' WHERE user_id = ?';
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to update user information');
    }
    
    // Fetch the updated user information to return to the frontend
    $selectStmt = $conn->prepare('SELECT user_id, username, first_name, last_name, phone_number FROM user WHERE user_id = ?');
    $selectStmt->bind_param('i', $user_id);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $updated_user = $result->fetch_assoc();

    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully',
        'user' => $updated_user // Return the updated user data
    ]);
    
} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($conn)) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
     if (isset($selectStmt)) {
        $selectStmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
}
?> 
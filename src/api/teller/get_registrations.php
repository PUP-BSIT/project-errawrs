<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Check if teller is logged in
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'teller') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

try {
    $db = db_connect();
    
    // Get all pending registrations
    $stmt = $db->prepare('
        SELECT * FROM registration_request 
        ORDER BY created_at DESC
    ');
    $stmt->execute();
    $result = $stmt->get_result();
    
    $registrations = [];
    while ($row = $result->fetch_assoc()) {
        // Don't send sensitive data like ID images
        unset($row['id_image']);
        $registrations[] = $row;
    }

    echo json_encode([
        'success' => true,
        'registrations' => $registrations
    ]);

} catch (Exception $e) {
    error_log("Get Registrations Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($db)) $db->close();
}
?> 
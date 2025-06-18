<?php
require_once __DIR__ . '/../../config/SessionManager.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$session = SessionManager::getInstance();
if (!$session->isAuthenticated() || $_SESSION['auth']['type'] !== 'teller') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}
$session->updateActivity();

require_once __DIR__ . '/../../config/database.php';

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $db = db_connect();
    
    // Get all pending registrations
    $stmt = $db->prepare('
        SELECT registration_id, first_name, last_name, phone_number, date_of_birth, nationality, street, city, zip_code, country, email, id_type, status, created_at, updated_at
        FROM registration_request
        WHERE status = "pending"
        ORDER BY created_at DESC
    ');
    $stmt->execute();
    $result = $stmt->get_result();
    
    $registrations = [];
    while ($row = $result->fetch_assoc()) {
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
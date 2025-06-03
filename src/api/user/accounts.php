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

try {
    $conn = db_connect();
    
    // Debug - log the user ID
    error_log("Fetching accounts for user ID: $user_id");
    
    // Fetch accounts for the logged-in user with only fields that exist
    $stmt = $conn->prepare('SELECT account_id, account_number, balance, status, account_type FROM account WHERE user_id = ?');
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $accounts = [];
    while ($row = $result->fetch_assoc()) {
        // If account_type is null, set a default value
        if (empty($row['account_type'])) {
            $row['account_type'] = 'standard';
        }
        $accounts[] = $row;
    }
    
    // Debug - log the number of accounts found
    error_log("Found " . count($accounts) . " accounts for user ID: $user_id");
    
    echo json_encode([
        'success' => true,
        'accounts' => $accounts
    ]);
    
} catch (Exception $e) {
    error_log("Error in accounts.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
}
?> 
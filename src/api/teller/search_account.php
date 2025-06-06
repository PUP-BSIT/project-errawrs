<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Enable CORS for localhost development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

    // Get parameters from either GET or POST
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Read POST JSON data
        $json_data = file_get_contents('php://input');
        $data = json_decode($json_data, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON data provided');
        }
        
        $search_term = isset($data['search']) ? trim($data['search']) : '';
        $teller_number = isset($data['teller_number']) ? trim($data['teller_number']) : '';
    } else {
        // Get GET parameters
        $search_term = isset($_GET['search']) ? trim($_GET['search']) : '';
        $teller_number = isset($_GET['teller_number']) ? trim($_GET['teller_number']) : '';
    }

    // Validate input
    if (empty($search_term)) {
        throw new Exception('Search term is required');
    }

    if (empty($teller_number)) {
        throw new Exception('Teller number is required');
    }

    // Verify teller exists and is active
    $teller_sql = "SELECT teller_id FROM teller WHERE teller_number = ? AND status = 'active'";
    $teller_stmt = mysqli_prepare($conn, $teller_sql);
    if (!$teller_stmt) {
        throw new Exception('Failed to prepare teller query: ' . mysqli_error($conn));
    }
    
    mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
    if (!mysqli_stmt_execute($teller_stmt)) {
        throw new Exception('Failed to execute teller query: ' . mysqli_stmt_error($teller_stmt));
    }
    
    $teller_result = mysqli_stmt_get_result($teller_stmt);
    if (mysqli_num_rows($teller_result) !== 1) {
        throw new Exception('Unauthorized. Invalid or inactive teller.');
    }

    // Search accounts with all necessary information
    $search_sql = "SELECT 
        a.account_number,
        a.balance,
        a.status,
        a.account_type,
        u.first_name,
        u.last_name,
        u.phone_number
    FROM account a
    JOIN user u ON a.user_id = u.user_id
    WHERE (
        a.account_number LIKE ? OR
        u.first_name LIKE ? OR
        u.last_name LIKE ? OR
        u.phone_number LIKE ? OR
        CONCAT(u.first_name, ' ', u.last_name) LIKE ?
    )
    AND a.status != 'deleted'
    ORDER BY 
        CASE 
            WHEN a.account_number = ? THEN 0
            WHEN a.account_number LIKE ? THEN 1
            WHEN CONCAT(u.first_name, ' ', u.last_name) = ? THEN 2
            ELSE 3
        END,
        a.account_number ASC
    LIMIT 10";

    $search_pattern = "%{$search_term}%";
    $search_stmt = mysqli_prepare($conn, $search_sql);
    if (!$search_stmt) {
        throw new Exception('Failed to prepare search query: ' . mysqli_error($conn));
    }

    mysqli_stmt_bind_param($search_stmt, "ssssssss", 
        $search_pattern,    // account_number LIKE
        $search_pattern,    // first_name LIKE
        $search_pattern,    // last_name LIKE
        $search_pattern,    // phone_number LIKE
        $search_pattern,    // full name LIKE
        $search_term,       // exact account number match
        $search_pattern,    // partial account number match
        $search_term       // exact full name match
    );

    if (!mysqli_stmt_execute($search_stmt)) {
        throw new Exception('Failed to execute search query: ' . mysqli_stmt_error($search_stmt));
    }

    $search_result = mysqli_stmt_get_result($search_stmt);
    if (!$search_result) {
        throw new Exception('Failed to get search results: ' . mysqli_error($conn));
    }

    $accounts = [];
    $counter = 1;
    while ($row = mysqli_fetch_assoc($search_result)) {
        // Format the data exactly as UI expects
        $accounts[] = [
            'number' => $counter++,
            'account_number' => $row['account_number'],
            'balance' => number_format((float)$row['balance'], 2),
            'status' => strtolower($row['status']),
            'account_type' => $row['account_type'],
            'user' => [
                'name' => trim($row['first_name'] . ' ' . $row['last_name']),
                'phone_number' => $row['phone_number']
            ]
        ];
    }

    // Return success response
    echo json_encode([
        'success' => true,
        'accounts' => $accounts,
        'count' => count($accounts)
    ]);

} catch (Exception $e) {
    error_log("Search Account Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    // Clean up
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    if (isset($search_stmt)) mysqli_stmt_close($search_stmt);
    if (isset($conn)) mysqli_close($conn);
} 
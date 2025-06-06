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

    // Debug logging
    error_log("Method: " . $_SERVER['REQUEST_METHOD']);
    error_log("Search term: " . $search_term);
    error_log("Teller number: " . $teller_number);

    // Validate input
    if (empty($search_term)) {
        throw new Exception('Search term is required');
    }

    if (empty($teller_number)) {
        throw new Exception('Teller number is required');
    }

    // Verify teller exists and is active
    $teller_sql = "SELECT teller_id, status FROM teller WHERE teller_number = ? AND status = 'active'";
    $teller_stmt = mysqli_prepare($conn, $teller_sql);
    mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
    mysqli_stmt_execute($teller_stmt);
    $teller_result = mysqli_stmt_get_result($teller_stmt);

    if (mysqli_num_rows($teller_result) !== 1) {
        throw new Exception('Unauthorized. Invalid or inactive teller.');
    }

    // Get teller information
    $teller_sql = "SELECT teller_id, first_name, last_name FROM teller WHERE teller_number = ? AND status = 'active'";
    $teller_stmt = mysqli_prepare($conn, $teller_sql);
    mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
    mysqli_stmt_execute($teller_stmt);
    $teller_result = mysqli_stmt_get_result($teller_stmt);

    if (mysqli_num_rows($teller_result) !== 1) {
        throw new Exception('Unauthorized. Invalid or inactive teller.');
    }

    $teller = mysqli_fetch_assoc($teller_result);

    // Search accounts
    $search_sql = "SELECT 
        a.account_id,
        a.account_number,
        a.balance,
        a.status,
        a.created_at,
        u.user_id,
        u.first_name,
        u.last_name,
        u.phone_number
    FROM account a
    JOIN user u ON a.user_id = u.user_id
    WHERE (
        a.account_number LIKE ? OR
        u.first_name LIKE ? OR
        u.last_name LIKE ? OR
        u.phone_number LIKE ?
    )
    ORDER BY a.account_number
    LIMIT 10";

    $search_pattern = "%{$search_term}%";
    $search_stmt = mysqli_prepare($conn, $search_sql);
    mysqli_stmt_bind_param($search_stmt, "ssss", 
        $search_pattern,
        $search_pattern,
        $search_pattern,
        $search_pattern
    );

    mysqli_stmt_execute($search_stmt);
    $search_result = mysqli_stmt_get_result($search_stmt);

    $accounts = [];
    while ($row = mysqli_fetch_assoc($search_result)) {
        // Format the data
        $accounts[] = [
            'account_id' => $row['account_id'],
            'account_number' => $row['account_number'],
            'balance' => number_format((float)$row['balance'], 2),
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'user' => [
                'id' => $row['user_id'],
                'name' => $row['first_name'] . ' ' . $row['last_name'],
                'phone_number' => $row['phone_number']
            ]
        ];
    }

    // Return success response with teller info
    echo json_encode([
        'success' => true,
        'accounts' => $accounts,
        'count' => count($accounts),
        'search_term' => $search_term,
        'teller' => [
            'id' => $teller['teller_id'],
            'name' => $teller['first_name'] . ' ' . $teller['last_name']
        ],
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'received_params' => $_SERVER['REQUEST_METHOD'] === 'POST' ? $data : $_GET
        ]
    ]);

} catch (Exception $e) {
    error_log("Search Account Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'received_params' => $_SERVER['REQUEST_METHOD'] === 'POST' ? 
                (isset($data) ? $data : []) : $_GET
        ]
    ]);
} finally {
    // Clean up
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    if (isset($search_stmt)) mysqli_stmt_close($search_stmt);
    if (isset($conn)) mysqli_close($conn);
} 
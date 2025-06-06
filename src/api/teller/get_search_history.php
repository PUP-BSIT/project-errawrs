<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Enable CORS for localhost development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

    // Get teller number from request
    $teller_number = isset($_GET['teller_number']) ? trim($_GET['teller_number']) : '';

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

    // Get the teller's recent transactions which represent their search history
    // We'll use the transaction table to find accounts they've interacted with
    $history_sql = "SELECT DISTINCT 
        a.account_id,
        a.account_number,
        a.balance,
        a.status as account_status,
        CONCAT(u.first_name, ' ', u.last_name) as account_name,
        u.phone_number,
        MAX(t.created_at) as last_interaction
    FROM transaction t
    JOIN account a ON (t.sender_account_id = a.account_id OR t.receiver_account_id = a.account_id)
    JOIN user u ON a.user_id = u.user_id
    WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY a.account_id, a.account_number, a.balance, a.status, account_name, u.phone_number
    ORDER BY last_interaction DESC
    LIMIT 10";

    $history_stmt = mysqli_prepare($conn, $history_sql);
    mysqli_stmt_execute($history_stmt);
    $history_result = mysqli_stmt_get_result($history_stmt);

    $search_history = [];
    while ($row = mysqli_fetch_assoc($history_result)) {
        $search_history[] = [
            'account_number' => $row['account_number'],
            'account_name' => $row['account_name'],
            'balance' => number_format($row['balance'], 2),
            'status' => $row['account_status'],
            'phone_number' => $row['phone_number'],
            'last_interaction' => $row['last_interaction']
        ];
    }

    // Return success response
    echo json_encode([
        'success' => true,
        'history' => $search_history,
        'count' => count($search_history)
    ]);

} catch (Exception $e) {
    error_log("Get Search History Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    // Clean up
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    if (isset($history_stmt)) mysqli_stmt_close($history_stmt);
    if (isset($conn)) mysqli_close($conn);
} 
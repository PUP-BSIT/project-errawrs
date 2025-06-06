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

    // Get today's date range
    $today_start = date('Y-m-d 00:00:00');
    $today_end = date('Y-m-d 23:59:59');
    $current_date = date('Y-m-d');

    // Get total deposits today
    $deposits_query = "SELECT COALESCE(SUM(amount), 0) as total 
                      FROM transaction 
                      WHERE created_at BETWEEN ? AND ?
                      AND transaction_type = 'deposit'
                      AND status = 'completed'";
    $deposits_stmt = mysqli_prepare($conn, $deposits_query);
    mysqli_stmt_bind_param($deposits_stmt, 'ss', $today_start, $today_end);
    mysqli_stmt_execute($deposits_stmt);
    $deposits_result = mysqli_stmt_get_result($deposits_stmt);
    $total_deposits = mysqli_fetch_assoc($deposits_result)['total'];

    // Get total withdrawals today
    $withdrawals_query = "SELECT COALESCE(SUM(amount), 0) as total 
                         FROM transaction 
                         WHERE created_at BETWEEN ? AND ?
                         AND transaction_type = 'withdrawal'
                         AND status = 'completed'";
    $withdrawals_stmt = mysqli_prepare($conn, $withdrawals_query);
    mysqli_stmt_bind_param($withdrawals_stmt, 'ss', $today_start, $today_end);
    mysqli_stmt_execute($withdrawals_stmt);
    $withdrawals_result = mysqli_stmt_get_result($withdrawals_stmt);
    $total_withdrawals = mysqli_fetch_assoc($withdrawals_result)['total'];

    // Get total closed accounts today
    $closed_query = "SELECT COUNT(*) as total 
                    FROM account 
                    WHERE DATE(created_at) = ? 
                    AND status = 'closed'";
    $closed_stmt = mysqli_prepare($conn, $closed_query);
    mysqli_stmt_bind_param($closed_stmt, 's', $current_date);
    mysqli_stmt_execute($closed_stmt);
    $closed_result = mysqli_stmt_get_result($closed_stmt);
    $total_closed = mysqli_fetch_assoc($closed_result)['total'];

    // Get total reopened accounts today
    $reopened_query = "SELECT COUNT(*) as total 
                      FROM account 
                      WHERE DATE(created_at) = ? 
                      AND status = 'active'
                      AND account_id IN (
                          SELECT account_id 
                          FROM transaction 
                          WHERE transaction_type = 'deposit' 
                          AND description LIKE '%Account reopened%'
                          AND DATE(created_at) = ?
                      )";
    $reopened_stmt = mysqli_prepare($conn, $reopened_query);
    mysqli_stmt_bind_param($reopened_stmt, 'ss', $current_date, $current_date);
    mysqli_stmt_execute($reopened_stmt);
    $reopened_result = mysqli_stmt_get_result($reopened_stmt);
    $total_reopened = mysqli_fetch_assoc($reopened_result)['total'];

    // Current date in YYYY-MM-DD format
    $last_updated = date('Y-m-d');

    // Format the response to match UI
    $response = [
        'success' => true,
        'summary' => [
            [
                'icon' => '💰',
                'title' => 'Total Deposits Today',
                'amount_count' => 'P' . number_format($total_deposits, 2),
                'date' => $last_updated
            ],
            [
                'icon' => '💸',
                'title' => 'Total Withdrawals Today',
                'amount_count' => 'P' . number_format($total_withdrawals, 2),
                'date' => $last_updated
            ],
            [
                'icon' => '🔒',
                'title' => 'Total Closed Accounts',
                'amount_count' => $total_closed . ' Accounts',
                'date' => $last_updated
            ],
            [
                'icon' => '🔓',
                'title' => 'Total Re-opened Accounts',
                'amount_count' => $total_reopened . ' Accounts',
                'date' => $last_updated
            ]
        ]
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("Dashboard Summary Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    // Clean up
    if (isset($deposits_stmt)) mysqli_stmt_close($deposits_stmt);
    if (isset($withdrawals_stmt)) mysqli_stmt_close($withdrawals_stmt);
    if (isset($closed_stmt)) mysqli_stmt_close($closed_stmt);
    if (isset($reopened_stmt)) mysqli_stmt_close($reopened_stmt);
    if (isset($conn)) mysqli_close($conn);
} 
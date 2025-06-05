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
    $teller_sql = "SELECT teller_id FROM teller WHERE teller_number = ? AND status = 'active'";
    $teller_stmt = mysqli_prepare($conn, $teller_sql);
    mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
    mysqli_stmt_execute($teller_stmt);
    $teller_result = mysqli_stmt_get_result($teller_stmt);

    if (mysqli_num_rows($teller_result) !== 1) {
        throw new Exception('Unauthorized. Invalid or inactive teller.');
    }

    // Get today's date in MySQL format
    $today = date('Y-m-d');

    // Get total deposits today
    $deposits_sql = "SELECT COALESCE(SUM(amount), 0) as total 
                    FROM transaction 
                    WHERE DATE(created_at) = ? 
                    AND transaction_type = 'deposit'
                    AND completed_at IS NOT NULL";
    $deposits_stmt = mysqli_prepare($conn, $deposits_sql);
    mysqli_stmt_bind_param($deposits_stmt, "s", $today);
    mysqli_stmt_execute($deposits_stmt);
    $total_deposits = mysqli_fetch_assoc(mysqli_stmt_get_result($deposits_stmt))['total'];

    // Get total withdrawals today
    $withdrawals_sql = "SELECT COALESCE(SUM(amount), 0) as total 
                       FROM transaction 
                       WHERE DATE(created_at) = ? 
                       AND transaction_type = 'withdrawal'
                       AND completed_at IS NOT NULL";
    $withdrawals_stmt = mysqli_prepare($conn, $withdrawals_sql);
    mysqli_stmt_bind_param($withdrawals_stmt, "s", $today);
    mysqli_stmt_execute($withdrawals_stmt);
    $total_withdrawals = mysqli_fetch_assoc(mysqli_stmt_get_result($withdrawals_stmt))['total'];

    // Get total closed accounts today
    $closed_sql = "SELECT COUNT(*) as total 
                   FROM transaction 
                   WHERE DATE(created_at) = ? 
                   AND transaction_type = 'withdrawal'
                   AND description LIKE '%Account closed%'
                   AND completed_at IS NOT NULL";
    $closed_stmt = mysqli_prepare($conn, $closed_sql);
    mysqli_stmt_bind_param($closed_stmt, "s", $today);
    mysqli_stmt_execute($closed_stmt);
    $total_closed = mysqli_fetch_assoc(mysqli_stmt_get_result($closed_stmt))['total'];

    // Get total reopened accounts today
    $reopened_sql = "SELECT COUNT(*) as total 
                     FROM transaction 
                     WHERE DATE(created_at) = ? 
                     AND transaction_type = 'deposit'
                     AND description LIKE '%Account reopened%'
                     AND completed_at IS NOT NULL";
    $reopened_stmt = mysqli_prepare($conn, $reopened_sql);
    mysqli_stmt_bind_param($reopened_stmt, "s", $today);
    mysqli_stmt_execute($reopened_stmt);
    $total_reopened = mysqli_fetch_assoc(mysqli_stmt_get_result($reopened_stmt))['total'];

    // Return success response
    echo json_encode([
        'success' => true,
        'summary' => [
            'deposits' => [
                'amount' => number_format($total_deposits, 2),
                'last_updated' => date('g:i A')
            ],
            'withdrawals' => [
                'amount' => number_format($total_withdrawals, 2),
                'last_updated' => date('g:i A')
            ],
            'closed_accounts' => [
                'count' => $total_closed,
                'last_updated' => date('g:i A')
            ],
            'reopened_accounts' => [
                'count' => $total_reopened,
                'last_updated' => date('g:i A')
            ]
        ]
    ]);

} catch (Exception $e) {
    error_log("Dashboard Summary Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    // Clean up
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    if (isset($deposits_stmt)) mysqli_stmt_close($deposits_stmt);
    if (isset($withdrawals_stmt)) mysqli_stmt_close($withdrawals_stmt);
    if (isset($closed_stmt)) mysqli_stmt_close($closed_stmt);
    if (isset($reopened_stmt)) mysqli_stmt_close($reopened_stmt);
    if (isset($conn)) mysqli_close($conn);
} 
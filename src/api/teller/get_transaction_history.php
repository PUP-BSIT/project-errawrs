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
    
    // Get pagination parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 10;
    $offset = ($page - 1) * $limit;

    if (empty($teller_number)) {
        throw new Exception('Teller number is required');
    }

    // Verify teller exists and is active
    $teller_sql = "SELECT teller_id, teller_number, status FROM teller WHERE teller_number = ?";
    $teller_stmt = mysqli_prepare($conn, $teller_sql);
    mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
    mysqli_stmt_execute($teller_stmt);
    $teller_result = mysqli_stmt_get_result($teller_stmt);
    
    if (mysqli_num_rows($teller_result) !== 1) {
        throw new Exception('Invalid teller number.');
    }
    
    $teller = mysqli_fetch_assoc($teller_result);
    
    if ($teller['status'] !== 'active') {
        throw new Exception('Teller account is not active.');
    }

    // Get total count for pagination
    $count_sql = "SELECT COUNT(*) as total FROM transaction";
    $count_result = mysqli_query($conn, $count_sql);
    $total_records = mysqli_fetch_assoc($count_result)['total'];
    $total_pages = ceil($total_records / $limit);

    // Get transactions with related information
    $transactions_sql = "SELECT 
        t.transaction_id,
        t.transaction_type,
        t.amount,
        t.description,
        t.created_at,
        t.completed_at,
        t.status,
        t.external_bank_code,
        t.external_account_number,
        -- Sender details
        sa.account_number as sender_account_number,
        CONCAT(su.first_name, ' ', su.last_name) as sender_name,
        -- Receiver details
        ra.account_number as receiver_account_number,
        CONCAT(ru.first_name, ' ', ru.last_name) as receiver_name
    FROM transaction t
    LEFT JOIN account sa ON t.sender_account_id = sa.account_id
    LEFT JOIN user su ON sa.user_id = su.user_id
    LEFT JOIN account ra ON t.receiver_account_id = ra.account_id
    LEFT JOIN user ru ON ra.user_id = ru.user_id
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?";

    $transactions_stmt = mysqli_prepare($conn, $transactions_sql);
    mysqli_stmt_bind_param($transactions_stmt, "ii", $limit, $offset);
    mysqli_stmt_execute($transactions_stmt);
    $transactions_result = mysqli_stmt_get_result($transactions_stmt);

    $transactions = [];
    while ($row = mysqli_fetch_assoc($transactions_result)) {
        // Format the transaction data based on type
        $transaction = [
            'transaction_id' => $row['transaction_id'],
            'type' => $row['transaction_type'],
            'amount' => number_format($row['amount'], 2),
            'description' => $row['description'] === '0' ? '' : $row['description'],
            'created_at' => $row['created_at'],
            'completed_at' => $row['completed_at'],
            'status' => $row['status']
        ];

        // Handle different transaction types
        switch ($row['transaction_type']) {
            case 'transfer_internal':
                $transaction['sender'] = [
                    'account_number' => $row['sender_account_number'],
                    'name' => $row['sender_name']
                ];
                $transaction['receiver'] = [
                    'account_number' => $row['receiver_account_number'],
                    'name' => $row['receiver_name']
                ];
                break;

            case 'transfer_external_in':
                $transaction['sender'] = [
                    'account_number' => $row['external_account_number'],
                    'bank_code' => $row['external_bank_code']
                ];
                $transaction['receiver'] = [
                    'account_number' => $row['receiver_account_number'],
                    'name' => $row['receiver_name']
                ];
                break;

            case 'deposit':
                $transaction['receiver'] = [
                    'account_number' => $row['receiver_account_number'],
                    'name' => $row['receiver_name']
                ];
                break;

            case 'withdrawal':
                $transaction['sender'] = [
                    'account_number' => $row['sender_account_number'],
                    'name' => $row['sender_name']
                ];
                break;
        }

        $transactions[] = $transaction;
    }

    // Return success response
    echo json_encode([
        'success' => true,
        'transactions' => $transactions,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'limit' => $limit,
            'total_records' => $total_records
        ]
    ]);

} catch (Exception $e) {
    error_log("Transaction History Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    // Clean up
    if (isset($teller_stmt)) mysqli_stmt_close($teller_stmt);
    if (isset($transactions_stmt)) mysqli_stmt_close($transactions_stmt);
    if (isset($conn)) mysqli_close($conn);
} 
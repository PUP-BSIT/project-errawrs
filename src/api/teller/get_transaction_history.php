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
    $teller_sql = "SELECT teller_id, teller_number, status FROM teller WHERE teller_number = ? AND status = 'active'";
    $teller_stmt = mysqli_prepare($conn, $teller_sql);
    mysqli_stmt_bind_param($teller_stmt, "s", $teller_number);
    mysqli_stmt_execute($teller_stmt);
    $teller_result = mysqli_stmt_get_result($teller_stmt);
    
    if (mysqli_num_rows($teller_result) !== 1) {
        throw new Exception('Unauthorized. Invalid or inactive teller.');
    }

    // Get teller_id
    $teller = mysqli_fetch_assoc($teller_result);
    $teller_id = $teller['teller_id'];

    // Get total count for pagination
    $count_sql = "SELECT COUNT(*) as total FROM transaction WHERE teller_id = ?";
    $count_stmt = mysqli_prepare($conn, $count_sql);
    mysqli_stmt_bind_param($count_stmt, "i", $teller_id);
    mysqli_stmt_execute($count_stmt);
    $count_result = mysqli_stmt_get_result($count_stmt);
    $total_records = mysqli_fetch_assoc($count_result)['total'];
    $total_pages = ceil($total_records / $limit);

    // Get transactions with related information
    $transactions_sql = "SELECT 
        t.transaction_id,
        t.transaction_type,
        t.amount,
        t.status,
        t.created_at,
        t.description,
        -- Sender account details
        sa.account_number as sender_account_number,
        sa.account_type as sender_account_type,
        CONCAT(su.first_name, ' ', su.last_name) as sender_name,
        -- Receiver account details
        ra.account_number as receiver_account_number,
        ra.account_type as receiver_account_type,
        CONCAT(ru.first_name, ' ', ru.last_name) as receiver_name,
        -- External transfer details
        t.external_bank_code,
        t.external_account_number
    FROM transaction t
    LEFT JOIN account sa ON t.sender_account_id = sa.account_id
    LEFT JOIN user su ON sa.user_id = su.user_id
    LEFT JOIN account ra ON t.receiver_account_id = ra.account_id
    LEFT JOIN user ru ON ra.user_id = ru.user_id
    WHERE t.teller_id = ?
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?";

    $transactions_stmt = mysqli_prepare($conn, $transactions_sql);
    mysqli_stmt_bind_param($transactions_stmt, "iii", $teller_id, $limit, $offset);
    mysqli_stmt_execute($transactions_stmt);
    $transactions_result = mysqli_stmt_get_result($transactions_stmt);

    $transactions = [];
    while ($row = mysqli_fetch_assoc($transactions_result)) {
        $created_at = new DateTime($row['created_at']);
        
        // Determine the primary account number and name based on transaction type
        $account_number = '';
        $account_name = '';
        $card_type = '';
        $action = '';
        
        switch ($row['transaction_type']) {
            case 'transfer_internal':
                $account_number = $row['sender_account_number'];
                $account_name = $row['sender_name'];
                $card_type = $row['sender_account_type'];
                $action = 'Transfer to ' . $row['receiver_account_number'];
                break;

            case 'transfer_external_in':
                $account_number = $row['receiver_account_number'];
                $account_name = $row['receiver_name'];
                $card_type = $row['receiver_account_type'];
                $action = 'External Transfer from ' . $row['external_bank_code'];
                break;

            case 'deposit':
                $account_number = $row['receiver_account_number'];
                $account_name = $row['receiver_name'];
                $card_type = $row['receiver_account_type'];
                $action = 'Deposit';
                break;

            case 'withdrawal':
                $account_number = $row['sender_account_number'];
                $account_name = $row['sender_name'];
                $card_type = $row['sender_account_type'];
                $action = 'Withdrawal';
                break;
        }

        // Handle account closure/reopen cases from description
        if (strpos($row['description'], 'Account closed') !== false) {
            $action = 'Account Closed';
        } else if (strpos($row['description'], 'Account reopened') !== false) {
            $action = 'Account Reopened';
        }

        $transactions[] = [
            'date' => $created_at->format('Y-m-d'),
            'time' => $created_at->format('H:i:s'),
            'account_number' => $account_number,
            'account_name' => $account_name,
            'amount' => number_format((float)$row['amount'], 2),
            'card_type' => ucfirst($card_type),
            'action' => $action,
            'status' => $row['status']
        ];
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
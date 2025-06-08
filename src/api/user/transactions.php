<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

// Debug: Log session state
error_log("Session state: " . print_r($_SESSION, true));

// Check if user is logged in
if (!isset($_SESSION['auth']['id'])) {
    error_log("User not authenticated - no session ID found");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['auth']['id'];
error_log("Processing transactions for user_id: " . $user_id);



// Get pagination parameters
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10; // Default limit 10
$offset = ($page - 1) * $limit;

// Get account filter if provided
$account_number = isset($_GET['account']) ? $_GET['account'] : null;
error_log("Account filter: " . ($account_number ? $account_number : "None"));

try {
    error_log("Attempting database connection");
    $conn = db_connect();
    error_log("Database connection successful");

    // Build the WHERE clause based on whether an account filter is provided
    $whereClause = "a.user_id = ?";
    $params = [$user_id];
    $types = "i"; // Integer for user_id

    if ($account_number) {
        $whereClause .= " AND a.account_number = ?";
        $params[] = $account_number;
        $types .= "s"; // String for account_number
    }

    // Get total number of transactions for the user's accounts (with account filter if provided)
    $countQuery = "SELECT COUNT(*) as total 
                   FROM transaction t
                   JOIN account a ON (t.sender_account_id = a.account_id OR t.receiver_account_id = a.account_id)
                   WHERE $whereClause";
    error_log("Count query: " . $countQuery . " with params: " . implode(", ", $params));
    
    $countStmt = $conn->prepare($countQuery);
    $countStmt->bind_param($types, ...$params);
    $countStmt->execute();
    $totalTransactions = $countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();
    error_log("Total transactions found: " . $totalTransactions);

    // Fetch transactions for the user's accounts with pagination (and account filter if provided)
    $query = "SELECT 
                t.transaction_id, 
                t.amount, 
                t.transaction_type as type, 
                t.description, 
                t.created_at as transaction_date, 
                t.status,
                a.account_number,
                CASE 
                    WHEN t.sender_account_id = a.account_id THEN -t.amount
                    ELSE t.amount
                END as adjusted_amount
              FROM transaction t
              JOIN account a ON (t.sender_account_id = a.account_id OR t.receiver_account_id = a.account_id)
              WHERE $whereClause
              ORDER BY t.created_at DESC
              LIMIT ? OFFSET ?";
    
    // Add pagination parameters to the param array
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii"; // Two integers for limit and offset
    
    error_log("Main query: " . $query . " with params: " . implode(", ", $params));

    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    error_log("Query executed successfully");

    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        // Format date and amount for consistency with frontend expectations
        $row['date'] = date('Y-m-d H:i:s', strtotime($row['transaction_date'])); // Format date
        unset($row['transaction_date']); // Remove original date field

        // Use the adjusted amount which is negative for outgoing transactions
        $row['amount'] = (string)floatval($row['adjusted_amount']);
        unset($row['adjusted_amount']); // Remove the temporary field

        $transactions[] = $row;
    }
    error_log("Processed " . count($transactions) . " transactions");

    echo json_encode([
        'success' => true,
        'total' => $totalTransactions,
        'page' => $page,
        'limit' => $limit,
        'transactions' => $transactions,
        'account_filter' => $account_number
    ]);

} catch (Exception $e) {
    error_log("Error in transactions.php: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An error occurred while fetching transactions. Please check the error logs for details.'
    ]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
    error_log("Connection closed");
}
?> 
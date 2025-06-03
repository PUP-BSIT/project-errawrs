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

// Get pagination parameters
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10; // Default limit 10
$offset = ($page - 1) * $limit;

try {
    $conn = db_connect();

    // Get total number of transactions for the user's accounts
    $countQuery = "SELECT COUNT(*) as total FROM transaction t
                   JOIN account a ON t.account_id = a.account_id
                   WHERE a.user_id = ?";
    $countStmt = $conn->prepare($countQuery);
    $countStmt->bind_param('i', $user_id);
    $countStmt->execute();
    $totalTransactions = $countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();

    // Fetch transactions for the user's accounts with pagination
    $query = "SELECT t.transaction_id, t.account_id, a.account_number, t.type, t.amount, t.description, t.transaction_date, t.status
              FROM transaction t
              JOIN account a ON t.account_id = a.account_id
              WHERE a.user_id = ?
              ORDER BY t.transaction_date DESC
              LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($query);
    $stmt->bind_param('iii', $user_id, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();

    $transactions = [];
    while ($row = $result->fetch_assoc()) {
         // Format date and amount for consistency with frontend expectations
        $row['date'] = date('Y-m-d H:i:s', strtotime($row['transaction_date'])); // Format date
        unset($row['transaction_date']); // Remove original date field

        // Convert amount to float and format as string
        $row['amount'] = (string)floatval($row['amount']);

        $transactions[] = $row;
    }

    echo json_encode([
        'success' => true,
        'total' => $totalTransactions,
        'page' => $page,
        'limit' => $limit,
        'transactions' => $transactions
    ]);

} catch (Exception $e) {
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
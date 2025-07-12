<?php
require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';

$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();
header('Content-Type: application/json');

define('DEBUG', true);
define('DEFAULT_LIMIT', 10);
define('MIN_PAGE', 1);
define('MIN_LIMIT', 1);

if (DEBUG) {
    error_log("Session state: " . print_r($_SESSION, true));
}

function validateUserAuthentication() {
    if (!isset($_SESSION['auth']['id'])) {
        if (DEBUG) {
            error_log("User not authenticated - no session ID found");
        }
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
}

function getPaginationParameters() {
    $page = isset($_GET['page']) ? max(MIN_PAGE, intval($_GET['page'])) : MIN_PAGE;
    $limit = isset($_GET['limit']) ? max(MIN_LIMIT, intval($_GET['limit'])) : DEFAULT_LIMIT;
    $offset = ($page - 1) * $limit;
    
    return [
        'page' => $page,
        'limit' => $limit,
        'offset' => $offset
    ];
}

function getAccountFilter() {
    return isset($_GET['account']) ? $_GET['account'] : null;
}

function buildWhereClause($userId, $accountNumber) {
    $whereClause = "a.user_id = ?";
    $params = [$userId];
    $types = "i";

    if ($accountNumber) {
        $whereClause .= " AND a.account_number = ?";
        $params[] = $accountNumber;
        $types .= "s";
    }

    return [
        'where_clause' => $whereClause,
        'params' => $params,
        'types' => $types
    ];
}

function getTotalTransactions($db, $whereClause, $params, $types) {
    $countQuery = "SELECT COUNT(*) as total 
                   FROM transaction t
                   JOIN account a ON (t.sender_account_id = a.account_id OR 
                                    t.receiver_account_id = a.account_id)
                   WHERE $whereClause";
    
    if (DEBUG) {
        error_log("Count query: " . $countQuery . " with params: " . implode(", ", $params));
    }
    
    $countQuery = $db->prepare($countQuery);
    $countQuery->bind_param($types, ...$params);
    $countQuery->execute();
    $totalTransactions = $countQuery->get_result()->fetch_assoc()['total'];
    $countQuery->close();
    
    if (DEBUG) {
        error_log("Total transactions found: " . $totalTransactions);
    }
    
    return $totalTransactions;
}

function buildTransactionQuery($whereClause) {
    return "SELECT 
                t.transaction_id, 
                t.amount, 
                t.transaction_type as type, 
                t.description, 
                t.created_at as transaction_date, 
                t.status,
                t.external_bank_code,
                t.external_account_number,
                sender.account_number as sender_account_number,
                receiver.account_number as receiver_account_number,
                a.account_number,
                CASE 
                    WHEN t.sender_account_id = a.account_id THEN -t.amount
                    ELSE t.amount
                END as adjusted_amount
              FROM transaction t
              JOIN account a ON (t.sender_account_id = a.account_id OR 
                               t.receiver_account_id = a.account_id)
              LEFT JOIN account sender ON t.sender_account_id = sender.account_id
              LEFT JOIN account receiver ON t.receiver_account_id = receiver.account_id
              WHERE $whereClause
              ORDER BY t.created_at DESC
              LIMIT ? OFFSET ?";
}

function fetchTransactions($db, $query, $params, $types) {
    if (DEBUG) {
        error_log("Main query: " . $query . " with params: " . implode(", ", $params));
    }

    $transactionQuery = $db->prepare($query);
    $transactionQuery->bind_param($types, ...$params);
    $transactionQuery->execute();
    $result = $transactionQuery->get_result();
    
    if (DEBUG) {
        error_log("Query executed successfully");
    }
    
    return $result;
}

function processTransactionResults($result) {
    $transactions = [];
    
    while ($row = $result->fetch_assoc()) {
        $row['date'] = date('Y-m-d H:i:s', strtotime($row['transaction_date']));
        unset($row['transaction_date']);

        $row['amount'] = (string)floatval($row['adjusted_amount']);
        unset($row['adjusted_amount']);

        $transactions[] = $row;
    }
    
    if (DEBUG) {
        error_log("Processed " . count($transactions) . " transactions");
    }
    
    return $transactions;
}

validateUserAuthentication();

$userId = $_SESSION['auth']['id'];
$pagination = getPaginationParameters();
$accountFilter = getAccountFilter();

if (DEBUG) {
    error_log("Processing transactions for user_id: " . $userId);
    error_log("Account filter: " . ($accountFilter ? $accountFilter : "None"));
}

try {
    if (DEBUG) {
        error_log("Attempting database connection");
    }
    
    $db = db_connect();
    
    if (DEBUG) {
        error_log("Database connection successful");
    }

    $whereData = buildWhereClause($userId, $accountFilter);
    
    $totalTransactions = getTotalTransactions(
        $db, 
        $whereData['where_clause'], 
        $whereData['params'], 
        $whereData['types']
    );

    $mainQuery = buildTransactionQuery($whereData['where_clause']);
    
    $queryParams = $whereData['params'];
    $queryParams[] = $pagination['limit'];
    $queryParams[] = $pagination['offset'];
    $queryTypes = $whereData['types'] . "ii";
    
    $result = fetchTransactions($db, $mainQuery, $queryParams, $queryTypes);
    
    $transactions = processTransactionResults($result);

    echo json_encode([
        'success' => true,
        'total' => $totalTransactions,
        'page' => $pagination['page'],
        'limit' => $pagination['limit'],
        'transactions' => $transactions,
        'account_filter' => $accountFilter
    ]);

} catch (Exception $e) {
    error_log("Error in transactions.php: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An error occurred while fetching transactions. ' .
                  'Please check the error logs for details.'
    ]);
} finally {
    if (isset($db)) {
        $db->close();
    }
    if (DEBUG) {
        error_log("Connection closed");
    }
}
?> 
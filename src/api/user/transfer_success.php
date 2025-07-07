<?php
require_once __DIR__ . '/../../config/SessionManager.php';
SessionManager::getInstance()->initSession();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

// Enable error logging
error_log("Transfer Success API called for transaction_id: " . ($_GET['transaction_id'] ?? 'none'));

if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

if (!isset($_GET['transaction_id'])) {
    echo json_encode(['success' => false, 'error' => 'Missing transaction_id']);
    exit();
}

$transaction_id = intval($_GET['transaction_id']);
$db = db_connect();

error_log("Fetching transaction data for ID: " . $transaction_id);

// Join with account table to get account numbers
$stmt = $db->prepare("
    SELECT 
        t.*, 
        t.external_account_number, 
        sender.account_number as sender_account_number,
        receiver.account_number as receiver_account_number
    FROM 
        transaction t
    LEFT JOIN 
        account sender ON t.sender_account_id = sender.account_id
    LEFT JOIN 
        account receiver ON t.receiver_account_id = receiver.account_id
    WHERE 
        t.transaction_id = ? 
    LIMIT 1
");

$stmt->bind_param('i', $transaction_id);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    error_log("Transaction found. Data: " . print_r($row, true));
    
    // Ensure we're using account numbers not IDs
    if (empty($row['sender_account_number']) && !empty($row['sender_account_id'])) {
        error_log("Sender account number missing. Using ID: " . $row['sender_account_id']);
        
        // Try to fetch the account number directly
        $accountStmt = $db->prepare("SELECT account_number FROM account WHERE account_id = ?");
        $accountStmt->bind_param('i', $row['sender_account_id']);
        $accountStmt->execute();
        $accountResult = $accountStmt->get_result();
        if ($accountRow = $accountResult->fetch_assoc()) {
            $row['sender_account_number'] = $accountRow['account_number'];
            error_log("Retrieved sender account number: " . $row['sender_account_number']);
        }
    }
    
    if (empty($row['receiver_account_number']) && !empty($row['receiver_account_id'])) {
        error_log("Receiver account number missing. Using ID: " . $row['receiver_account_id']);
        
        // Try to fetch the account number directly
        $accountStmt = $db->prepare("SELECT account_number FROM account WHERE account_id = ?");
        $accountStmt->bind_param('i', $row['receiver_account_id']);
        $accountStmt->execute();
        $accountResult = $accountStmt->get_result();
        if ($accountRow = $accountResult->fetch_assoc()) {
            $row['receiver_account_number'] = $accountRow['account_number'];
            error_log("Retrieved receiver account number: " . $row['receiver_account_number']);
        }
    }
    error_log('Row data: ' . print_r($row, true));
    $row['recipient_account'] = !empty($row['receiver_account_number'])
        ? $row['receiver_account_number']
        : (!empty($row['external_account_number']) ? $row['external_account_number'] : 'N/A');
    // Fetch sender's new balance
    $sender_balance = null;
    if (!empty($row['sender_account_number'])) {
        $stmt2 = $db->prepare('SELECT balance FROM account WHERE account_number = ?');
        $stmt2->bind_param('s', $row['sender_account_number']);
        $stmt2->execute();
        $balance_result = $stmt2->get_result();
        if ($bal_row = $balance_result->fetch_assoc()) {
            $sender_balance = $bal_row['balance'];
        }
    }
    $row['sender_new_balance'] = $sender_balance;
    echo json_encode(['success' => true, 'transaction' => $row]);
} else {
    error_log("Transaction not found for ID: " . $transaction_id);
    echo json_encode(['success' => false, 'error' => 'Transaction not found']);
}
?> 
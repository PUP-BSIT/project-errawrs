<?php
require_once __DIR__ . '/../../config/SessionManager.php';
SessionManager::getInstance()->initSession();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

define('DEBUG', true);

if (DEBUG) {
    error_log("Transfer Success API called for transaction_id: " . 
        ($_GET['transaction_id'] ?? 'none'));
}

function validateUserAuthentication() {
    if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
}

function validateTransactionId() {
    if (!isset($_GET['transaction_id'])) {
        echo json_encode(['success' => false, 'error' => 'Missing transaction_id']);
        exit();
    }
}

function getTransactionData($db, $transactionId) {
    $transactionQuery = $db->prepare("
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

    $transactionQuery->bind_param('i', $transactionId);
    $transactionQuery->execute();
    $result = $transactionQuery->get_result();
    
    return $result->fetch_assoc();
}

function getAccountNumber($db, $accountId) {
    $accountQuery = $db->prepare("SELECT account_number FROM account WHERE account_id = ?");
    $accountQuery->bind_param('i', $accountId);
    $accountQuery->execute();
    $accountResult = $accountQuery->get_result();
    $accountRow = $accountResult->fetch_assoc();
    
    return $accountRow ? $accountRow['account_number'] : null;
}

function getSenderBalance($db, $accountNumber) {
    if (empty($accountNumber)) {
        return null;
    }
    
    $balanceQuery = $db->prepare('SELECT balance FROM account WHERE account_number = ?');
    $balanceQuery->bind_param('s', $accountNumber);
    $balanceQuery->execute();
    $balanceResult = $balanceQuery->get_result();
    $balanceRow = $balanceResult->fetch_assoc();
    
    return $balanceRow ? $balanceRow['balance'] : null;
}

function processTransactionData($db, $transactionData) {
    if (DEBUG) {
        error_log("Transaction found. Data: " . print_r($transactionData, true));
    }
    
    if (empty($transactionData['sender_account_number']) && 
        !empty($transactionData['sender_account_id'])) {
        if (DEBUG) {
            error_log("Sender account number missing. Using ID: " . 
                $transactionData['sender_account_id']);
        }
        
        $senderAccountNumber = getAccountNumber($db, $transactionData['sender_account_id']);
        if ($senderAccountNumber) {
            $transactionData['sender_account_number'] = $senderAccountNumber;
            if (DEBUG) {
                error_log("Retrieved sender account number: " . $senderAccountNumber);
            }
        }
    }
    
    if (empty($transactionData['receiver_account_number']) && 
        !empty($transactionData['receiver_account_id'])) {
        if (DEBUG) {
            error_log("Receiver account number missing. Using ID: " . 
                $transactionData['receiver_account_id']);
        }
        
        $receiverAccountNumber = getAccountNumber($db, $transactionData['receiver_account_id']);
        if ($receiverAccountNumber) {
            $transactionData['receiver_account_number'] = $receiverAccountNumber;
            if (DEBUG) {
                error_log("Retrieved receiver account number: " . $receiverAccountNumber);
            }
        }
    }
    
    if (DEBUG) {
        error_log('Row data: ' . print_r($transactionData, true));
    }
    
    $transactionData['recipient_account'] = !empty($transactionData['receiver_account_number'])
        ? $transactionData['receiver_account_number']
        : (!empty($transactionData['external_account_number']) 
            ? $transactionData['external_account_number'] 
            : 'N/A');
    
    $senderBalance = getSenderBalance($db, $transactionData['sender_account_number']);
    $transactionData['sender_new_balance'] = $senderBalance;
    
    return $transactionData;
}

validateUserAuthentication();
validateTransactionId();

$transactionId = intval($_GET['transaction_id']);
$db = db_connect();

if (DEBUG) {
    error_log("Fetching transaction data for ID: " . $transactionId);
}

$transactionData = getTransactionData($db, $transactionId);

if ($transactionData) {
    $processedTransaction = processTransactionData($db, $transactionData);
    echo json_encode(['success' => true, 'transaction' => $processedTransaction]);
} else {
    if (DEBUG) {
        error_log("Transaction not found for ID: " . $transactionId);
    }
    echo json_encode(['success' => false, 'error' => 'Transaction not found']);
}
?> 
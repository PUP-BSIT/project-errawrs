<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit();
}

try {
    $db = db_connect();
    
    // Start transaction
    $db->begin_transaction();
    
    // Get user ID from session
    $user_id = $_SESSION['auth']['id'];
    
    // Check if user already has 3 accounts
    $checkStmt = $db->prepare('SELECT COUNT(*) as account_count FROM account WHERE user_id = ? AND status = "active"');
    $checkStmt->bind_param('i', $user_id);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['account_count'] >= 3) {
        throw new Exception('Maximum number of accounts (3) reached');
    }
    
    // Get the next account sequence number
    $seqResult = $db->query('SELECT MAX(CAST(SUBSTRING(account_number, 9) AS UNSIGNED)) as last_seq FROM account');
    $seqRow = $seqResult->fetch_assoc();
    $nextSeq = ($seqRow['last_seq'] ?? 0) + 1;
    
    // Generate account number (544YY0######)
    $year = date('y');
    $accountNumber = sprintf('544%s0%06d', $year, $nextSeq);
    
    // Create new account
    $accountStmt = $db->prepare('INSERT INTO account (user_id, account_number, balance, status) VALUES (?, ?, 0.00, "active")');
    $accountStmt->bind_param('is', $user_id, $accountNumber);
    
    if (!$accountStmt->execute()) {
        throw new Exception('Failed to create new account');
    }
    
    $account_id = $accountStmt->insert_id;
    
    // Get all user's accounts
    $allAccountsStmt = $db->prepare('SELECT account_id, account_number, balance, status FROM account WHERE user_id = ? AND status = "active"');
    $allAccountsStmt->bind_param('i', $user_id);
    $allAccountsStmt->execute();
    $allAccountsResult = $allAccountsStmt->get_result();
    
    $accounts = [];
    while ($account = $allAccountsResult->fetch_assoc()) {
        $accounts[] = $account;
    }
    
    // Update session with new account information
    $_SESSION['auth']['all_accounts'] = $accounts;
    
    // Commit transaction
    $db->commit();
    
    // Return success response with new account details
    echo json_encode([
        'success' => true,
        'message' => 'New account created successfully',
        'new_account' => [
            'account_id' => $account_id,
            'account_number' => $accountNumber,
            'balance' => '0.00',
            'status' => 'active'
        ],
        'all_accounts' => $accounts
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($db)) {
        $db->rollback();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
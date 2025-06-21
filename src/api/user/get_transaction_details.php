<?php
require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';

$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

header('Content-Type: application/json');

if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

if (!isset($_GET['transaction_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Transaction ID is required.']);
    exit();
}

$transaction_id = intval($_GET['transaction_id']);
$user_id = $_SESSION['auth']['id'];

try {
    $db = db_connect();

    // The query joins the transaction table with the account table twice 
    // to get the account numbers for both the sender and the receiver.
    // It also verifies that the transaction belongs to the logged-in user.
    $stmt = $db->prepare("
        SELECT 
            t.transaction_id,
            t.amount,
            t.created_at,
            sender.account_number as sender_account_number,
            receiver.account_number as receiver_account_number
        FROM 
            transaction t
        LEFT JOIN 
            account sender ON t.sender_account_id = sender.account_id
        LEFT JOIN 
            account receiver ON t.receiver_account_id = receiver.account_id
        WHERE 
            t.transaction_id = ? AND (sender.user_id = ? OR receiver.user_id = ?)
    ");
    $stmt->bind_param('iii', $transaction_id, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($transaction = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'transaction' => $transaction]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Transaction not found or you do not have permission to view it.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An error occurred while fetching transaction details.']);
}
?> 
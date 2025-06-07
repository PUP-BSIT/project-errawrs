<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json');

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
$stmt = $db->prepare("SELECT * FROM transaction WHERE transaction_id = ? LIMIT 1");
$stmt->bind_param('i', $transaction_id);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    echo json_encode(['success' => true, 'transaction' => $row]);
} else {
    echo json_encode(['success' => false, 'error' => 'Transaction not found']);
}
?> 
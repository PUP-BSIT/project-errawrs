<?php
header('Content-Type: application/json');
require_once '../../config/db_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$conn = getDBConnection();

// Get input
$data = json_decode(file_get_contents('php://input'), true);
$account_number = isset($data['account_number']) ? trim($data['account_number']) : '';
$amount = isset($data['amount']) ? (float)$data['amount'] : 0;
$teller_number = isset($data['teller_number']) ? (int)$data['teller_number'] : 0;
$pin = isset($data['pin']) ? $data['pin'] : '';

// Validate input
if (empty($account_number) || $amount <= 0 || empty($teller_number) || empty($pin)) {
    http_response_code(400);
    echo json_encode(['error' => 'Account number, amount, teller number, and PIN are required.']);
    exit();
}

// Validate amount format (max 2 decimal places)
if (round($amount, 2) != $amount) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid amount format.']);
    exit();
}
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
$teller_number = isset($data['teller_number']) ? (int)$data['teller_number'] : 0;
$password = isset($data['password']) ? $data['password'] : '';

if (empty($teller_number) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Teller number and password are required.']);
    exit();
}

$sql = "SELECT teller_number, first_name, last_name, email, password_hash, status FROM teller WHERE teller_number = $teller_number";
error_log("SQL: $sql");
$result = mysqli_query($conn, $sql);

if (!$result) {
    error_log("MySQL error: " . mysqli_error($conn));
}

if (!$result || mysqli_num_rows($result) !== 1) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid teller number or password.']);
    exit();
}

$teller = mysqli_fetch_assoc($result);

error_log('Teller found: ' . print_r($teller, true));

if (!password_verify($password, $teller['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid teller number or password.']);
    exit();
}

// Success: return teller details (excluding password_hash)
$response = [
    'teller_number' => $teller['teller_number'],
    'first_name' => $teller['first_name'],
    'last_name' => $teller['last_name'],
    'email' => $teller['email'],
    'status' => $teller['status']
];
echo json_encode(['success' => true, 'teller' => $response]);

mysqli_close($conn); 
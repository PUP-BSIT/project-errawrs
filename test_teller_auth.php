<?php
require_once 'src/config/database.php';

$db = db_connect();

// Test teller credentials
$teller_number = 'T000001';
$password = 'errawrs123';

$stmt = $db->prepare('SELECT teller_id, teller_number, password_hash, first_name, last_name, email, status FROM teller WHERE teller_number = ? LIMIT 1');
$stmt->bind_param('s', $teller_number);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo "Teller not found\n";
    exit;
}

$teller = $result->fetch_assoc();
echo "Teller found:\n";
print_r($teller);

if (password_verify($password, $teller['password_hash'])) {
    echo "Password is correct!\n";
} else {
    echo "Password is incorrect!\n";
} 
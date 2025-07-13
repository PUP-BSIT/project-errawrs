<?php
require_once 'src/config/database.php';

$db = db_connect();

// Reset teller password
$teller_number = 'T000001';
$new_password = 'errawrs123';
$password_hash = password_hash($new_password, PASSWORD_DEFAULT);

$stmt = $db->prepare('UPDATE teller SET password_hash = ? WHERE teller_number = ?');
$stmt->bind_param('ss', $password_hash, $teller_number);

if ($stmt->execute()) {
    echo "Password updated successfully!\n";
    echo "Teller: $teller_number\n";
    echo "New password: $new_password\n";
} else {
    echo "Failed to update password: " . $stmt->error . "\n";
} 
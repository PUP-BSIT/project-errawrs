<?php
require_once 'src/config/database.php';

try {
    $conn = db_connect();
    $result = mysqli_query($conn, "SELECT teller_id, teller_number, status FROM teller WHERE teller_id = 44");
    $row = mysqli_fetch_assoc($result);
    
    if ($row) {
        echo "Teller ID: " . $row['teller_id'] . ", Number: " . $row['teller_number'] . ", Status: " . $row['status'] . "\n";
    } else {
        echo "❌ Teller 44 not found\n";
    }
    
    mysqli_close($conn);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
} 
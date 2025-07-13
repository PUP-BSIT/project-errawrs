<?php
require_once 'src/config/database.php';

try {
    $conn = db_connect();
    $result = mysqli_query($conn, "SELECT account_number, balance, status FROM account WHERE status = 'active' ORDER BY balance ASC");
    
    echo "Available accounts:\n";
    while ($row = mysqli_fetch_assoc($result)) {
        echo "Account: " . $row['account_number'] . ", Balance: " . $row['balance'] . ", Status: " . $row['status'] . "\n";
    }
    
    // Check for closed accounts
    $closed_result = mysqli_query($conn, "SELECT account_number, balance, status FROM account WHERE status = 'closed' LIMIT 1");
    if ($closed_row = mysqli_fetch_assoc($closed_result)) {
        echo "\nClosed account found: " . $closed_row['account_number'] . " (Balance: " . $closed_row['balance'] . ")\n";
    } else {
        echo "\nNo closed accounts found\n";
    }
    
    mysqli_close($conn);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
} 
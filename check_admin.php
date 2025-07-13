<?php
require_once 'src/config/database.php';

try {
    $conn = db_connect();
    
    // Check admin table structure
    $result = mysqli_query($conn, "DESCRIBE admin");
    echo "Admin table structure:\n";
    while ($row = mysqli_fetch_assoc($result)) {
        echo "Column: " . $row['Field'] . " - Type: " . $row['Type'] . "\n";
    }
    
    // Check for admin users
    $admin_result = mysqli_query($conn, "SELECT * FROM admin LIMIT 5");
    echo "\nAdmin users:\n";
    while ($row = mysqli_fetch_assoc($admin_result)) {
        echo "ID: " . $row['admin_id'] . ", Username: " . $row['username'] . "\n";
        if (isset($row['password_hash'])) {
            echo "  Password hash: " . $row['password_hash'] . "\n";
            
            // Test if the password matches
            $test_password = 'admin123';
            if (password_verify($test_password, $row['password_hash'])) {
                echo "✅ Password 'admin123' matches the hash\n";
            } else {
                echo "❌ Password 'admin123' does NOT match the hash\n";
                
                // Update the password
                $new_hash = password_hash($test_password, PASSWORD_DEFAULT);
                mysqli_query($conn, "UPDATE admin SET password_hash = '$new_hash' WHERE username = 'admin'");
                echo "✅ Updated password hash for admin\n";
            }
        }
    }
    
    mysqli_close($conn);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
} 
<?php
require_once __DIR__ . '/../config/db_config.php';

// Test teller data
$test_teller = [
    'first_name' => 'Test',
    'last_name' => 'Teller',
    'email' => 'test.teller@stackovercash.com',
    'password' => 'Test@123',
    'status' => 'active'
];

try {
    $conn = getDBConnection();
    
    // Hash the password
    $password_hash = password_hash($test_teller['password'], PASSWORD_DEFAULT);
    
    // Check if test teller already exists
    $check_sql = "SELECT teller_number FROM teller WHERE email = ?";
    $check_stmt = mysqli_prepare($conn, $check_sql);
    mysqli_stmt_bind_param($check_stmt, "s", $test_teller['email']);
    mysqli_stmt_execute($check_stmt);
    $result = mysqli_stmt_get_result($check_stmt);
    
    if (mysqli_num_rows($result) > 0) {
        $row = mysqli_fetch_assoc($result);
        echo "Test teller already exists with teller number: " . $row['teller_number'] . "\n";
        echo "Use these credentials for testing:\n";
        echo "Teller Number: " . $row['teller_number'] . "\n";
        echo "Password: " . $test_teller['password'] . "\n";
    } else {
        // Insert new test teller
        $insert_sql = "INSERT INTO teller (first_name, last_name, email, password_hash, status) 
                      VALUES (?, ?, ?, ?, ?)";
        $insert_stmt = mysqli_prepare($conn, $insert_sql);
        mysqli_stmt_bind_param($insert_stmt, "sssss", 
            $test_teller['first_name'],
            $test_teller['last_name'],
            $test_teller['email'],
            $password_hash,
            $test_teller['status']
        );
        
        if (mysqli_stmt_execute($insert_stmt)) {
            $teller_number = mysqli_insert_id($conn);
            echo "Created test teller successfully!\n";
            echo "Use these credentials for testing:\n";
            echo "Teller Number: " . $teller_number . "\n";
            echo "Password: " . $test_teller['password'] . "\n";
        } else {
            throw new Exception("Failed to create test teller: " . mysqli_error($conn));
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
} finally {
    if (isset($check_stmt)) mysqli_stmt_close($check_stmt);
    if (isset($insert_stmt)) mysqli_stmt_close($insert_stmt);
    if (isset($conn)) mysqli_close($conn);
} 
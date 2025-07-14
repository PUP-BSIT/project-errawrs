<?php
/**
 * Admin User Creation Script
 * Creates an admin user with the specified credentials
 */

// Set the project root path
define('PROJECT_ROOT', realpath(__DIR__));

// Load environment variables and dependencies
require_once PROJECT_ROOT . '/vendor/autoload.php';

// Initialize environment variables
$dotenv = Dotenv\Dotenv::createImmutable(PROJECT_ROOT);
$dotenv->load();

// Include database configuration
require_once PROJECT_ROOT . '/src/config/database.php';

try {
    $db = db_connect();
    
    // Admin credentials
    $admin_data = [
        'username' => 'admin',
        'password' => 'Admin@123', // This will be hashed
        'first_name' => 'System',
        'last_name' => 'Administrator',
        'email' => 'errawrs@gmail.com'
    ];
    
    // Check if admin already exists
    $stmt = $db->prepare("SELECT admin_id FROM admin WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $admin_data['username'], $admin_data['email']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo "Admin user already exists!\n";
        $row = $result->fetch_assoc();
        echo "Admin ID: " . $row['admin_id'] . "\n";
        exit();
    }
    
    // Hash the password
    $password_hash = password_hash($admin_data['password'], PASSWORD_DEFAULT);
    
    // Insert the admin user
    $stmt = $db->prepare("INSERT INTO admin (username, password_hash, first_name, last_name, email) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", 
        $admin_data['username'], 
        $password_hash, 
        $admin_data['first_name'], 
        $admin_data['last_name'], 
        $admin_data['email']
    );
    
    if ($stmt->execute()) {
        $admin_id = $db->insert_id;
        echo "Admin user created successfully!\n";
        echo "Admin ID: " . $admin_id . "\n";
        echo "Username: " . $admin_data['username'] . "\n";
        echo "Password: " . $admin_data['password'] . "\n";
        echo "Email: " . $admin_data['email'] . "\n";
        echo "Name: " . $admin_data['first_name'] . " " . $admin_data['last_name'] . "\n";
    } else {
        echo "Error creating admin user: " . $stmt->error . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?> 
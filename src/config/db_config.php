<?php
function getDBConnection() {
    // Read .env file manually
    $envFile = __DIR__ . '/../.env';
    
    if (!file_exists($envFile)) {
        die(json_encode(['error' => '.env file not found']));
    }
    
    $envVars = [];
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue; // Skip comments
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $envVars[trim($key)] = trim($value);
        }
    }
    
    // Get database configuration
    $host = $envVars['DB_HOST'] ?? 'localhost';
    $db_name = $envVars['DB_NAME'] ?? '';
    $username = $envVars['DB_USER'] ?? 'root';
    $password = $envVars['DB_PASS'] ?? '';
    
    // Create connection
    $conn = mysqli_connect($host, $username, $password, $db_name);
    
    if (!$conn) {
        die(json_encode(['error' => 'Connection failed: ' . mysqli_connect_error()]));
    }
    
    return $conn;
}
?>
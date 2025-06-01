<?php
/**
 * Database connection function
 */
function db_connect() {
    try {
        // Read .env file from project root
        $envFile = __DIR__ . '/../../.env';
        
        if (!file_exists($envFile)) {
            throw new Exception('.env file not found at: ' . $envFile);
        }
        
        $envVars = [];
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        if ($lines === false) {
            throw new Exception('Failed to read .env file');
        }
        
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0) continue; // Skip comments
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $envVars[trim($key)] = trim($value);
            }
        }
        
        // Get database configuration with validation
        $required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
        foreach ($required as $key) {
            if (empty($envVars[$key])) {
                throw new Exception("Missing required environment variable: {$key}");
            }
        }
        
        // Create connection with error reporting
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        
        $conn = new mysqli(
            $envVars['DB_HOST'],
            $envVars['DB_USER'],
            $envVars['DB_PASS'],
            $envVars['DB_NAME']
        );
        
        // Set charset and collation
        $conn->set_charset('utf8mb4');
        
        // Set timezone to match PHP's timezone
        $timezone = date('P');
        $conn->query("SET time_zone='$timezone'");
        
        return $conn;
        
    } catch (mysqli_sql_exception $e) {
        // Handle MySQL specific errors
        $error = [
            'error' => 'Database connection failed',
            'message' => $e->getMessage(),
            'code' => $e->getCode()
        ];
        
        error_log("Database Connection Error: " . $e->getMessage());
        die(json_encode($error));
        
    } catch (Exception $e) {
        // Handle other errors
        $error = [
            'error' => 'Configuration error',
            'message' => $e->getMessage()
        ];
        
        error_log("Configuration Error: " . $e->getMessage());
        die(json_encode($error));
    }
}

/**
 * Helper function for prepared statements
 */
function db_prepare($query) {
    $conn = db_connect();
    return $conn->prepare($query);
}

/**
 * Helper function to close database connection
 */
function db_close($conn) {
    if ($conn instanceof mysqli && !$conn->connect_error) {
        $conn->close();
    }
}
?>
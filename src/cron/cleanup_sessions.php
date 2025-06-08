<?php
/**
 * Session Cleanup Cron Script
 * 
 * This script is designed to be run periodically (e.g., via cron) to clean up expired sessions.
 * It can be executed from the command line or via HTTP request with the appropriate token.
 * 
 * Usage:
 * - Command line: php cleanup_sessions.php
 * - HTTP: curl https://yoursite.com/src/cron/cleanup_sessions.php?token=YOUR_SECRET_TOKEN
 */

// Security check for web execution
if (php_sapi_name() !== 'cli') {
    // Set JSON response headers
    header('Content-Type: application/json');
    
    // Verify security token if not run from CLI
    $configToken = 'YOUR_SECRET_TOKEN'; // Change this to a secure random string
    $providedToken = $_GET['token'] ?? '';
    
    if ($providedToken !== $configToken) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid or missing security token'
        ]);
        exit();
    }
}

// Include database configuration
require_once __DIR__ . '/../config/database.php';

// Log function
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message" . PHP_EOL;
    
    // Output to console if CLI
    if (php_sapi_name() === 'cli') {
        echo $logMessage;
    }
    
    // Log to file
    file_put_contents(__DIR__ . '/session_cleanup.log', $logMessage, FILE_APPEND);
}

// Session timeout in seconds (5 minutes) - must match session_check.php
define('SESSION_TIMEOUT', 300);

// Function to clean up sessions
function cleanupSessions() {
    try {
        $db = db_connect();
        $cleanupCount = 0;
        
        // Get current timestamp minus timeout
        $expirationTime = time() - SESSION_TIMEOUT;
        
        // Get session save path and session name
        $sessionSavePath = session_save_path();
        $sessionName = session_name();
        
        logMessage("Session save path: $sessionSavePath");
        logMessage("Session name: $sessionName");
        
        // Clean up sessions from database if using custom storage
        // This is an example for a custom database-based session storage
        // Modify this based on your actual session storage mechanism
        /*
        $stmt = $db->prepare('DELETE FROM sessions WHERE last_activity < ?');
        $stmt->bind_param('i', $expirationTime);
        $stmt->execute();
        $cleanupCount = $stmt->affected_rows;
        $stmt->close();
        */
        
        // Clean up file-based sessions
        if ($sessionSavePath && is_dir($sessionSavePath)) {
            $directory = new DirectoryIterator($sessionSavePath);
            
            foreach ($directory as $fileinfo) {
                if (!$fileinfo->isDot() && $fileinfo->isFile()) {
                    $filename = $fileinfo->getFilename();
                    
                    // Only process session files
                    if (strpos($filename, 'sess_') === 0) {
                        $filePath = $fileinfo->getPathname();
                        $fileAge = time() - $fileinfo->getMTime();
                        
                        // If file is older than the session timeout
                        if ($fileAge > SESSION_TIMEOUT) {
                            if (unlink($filePath)) {
                                $cleanupCount++;
                                logMessage("Deleted expired session file: $filename");
                            } else {
                                logMessage("Failed to delete session file: $filename");
                            }
                        }
                    }
                }
            }
        }
        
        return $cleanupCount;
    } catch (Exception $e) {
        logMessage("Error: " . $e->getMessage());
        return false;
    }
}

// Execute cleanup
$startTime = microtime(true);
logMessage("Starting session cleanup");

$cleanupCount = cleanupSessions();

$executionTime = microtime(true) - $startTime;
logMessage("Session cleanup completed. Removed $cleanupCount expired sessions in " . number_format($executionTime, 4) . " seconds");

// Return results for HTTP requests
if (php_sapi_name() !== 'cli') {
    echo json_encode([
        'success' => true,
        'cleaned_sessions' => $cleanupCount,
        'execution_time' => number_format($executionTime, 4),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} 
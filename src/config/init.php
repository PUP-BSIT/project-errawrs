<?php
// Prevent direct access
if (!defined('BASE_PATH')) {
    define('BASE_PATH', dirname(__DIR__));
}

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', BASE_PATH . '/logs/error.log');

// Required files
require_once BASE_PATH . '/config/SessionManager.php';
require_once BASE_PATH . '/config/database.php';

// Initialize session
$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

// Set JSON response headers by default
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache'); 
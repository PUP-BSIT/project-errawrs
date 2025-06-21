<?php
require_once __DIR__ . '/../../config/SessionManager.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Output session information before initializing
echo "Before SessionManager::initSession():<br>";
echo "Session ID: " . session_id() . "<br>";
echo "Session Name: " . session_name() . "<br>";
echo "Session Status: " . session_status() . "<br>";

// Initialize session via SessionManager
$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();

// Output session information after initializing
echo "After SessionManager::initSession():<br>";
echo "Session ID: " . session_id() . "<br>";
echo "Session Name: " . session_name() . "<br>";
echo "Session Status: " . session_status() . "<br>";
echo "Session Data: <pre>" . print_r($_SESSION, true) . "</pre>";
echo "Cookie Data: <pre>" . print_r($_COOKIE, true) . "</pre>";
?> 
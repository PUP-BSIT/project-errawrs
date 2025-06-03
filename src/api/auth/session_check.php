<?php
session_start();
header('Content-Type: application/json');

// Session timeout in seconds (5 minutes)
define('SESSION_TIMEOUT', 300);

// Check if session exists
if (!isset($_SESSION['auth']) || !isset($_SESSION['auth']['id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'error' => 'Not authenticated'
    ]);
    exit();
}

// Check if session has expired based on last activity time
if (isset($_SESSION['auth']['last_activity']) && 
    (time() - $_SESSION['auth']['last_activity'] > SESSION_TIMEOUT)) {
    // Session has expired
    session_unset();
    session_destroy();
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'error' => 'Session expired'
    ]);
    exit();
}

// Update last activity time
$_SESSION['auth']['last_activity'] = time();

// Return session data
echo json_encode([
    'success' => true,
    'authenticated' => true,
    'user' => [
        'id' => $_SESSION['auth']['id'],
        'username' => $_SESSION['auth']['identifier'],
        'type' => $_SESSION['auth']['type'],
        'first_name' => $_SESSION['auth']['first_name'] ?? '',
        'last_name' => $_SESSION['auth']['last_name'] ?? '',
        'phone_number' => $_SESSION['auth']['phone_number'] ?? '',
        'last_activity' => $_SESSION['auth']['last_activity'],
        'session_expires_in' => SESSION_TIMEOUT
    ]
]); 
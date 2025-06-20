<?php
session_start();
require_once __DIR__ . '/../../config/database.php';

// Determine environment
function isLocalEnvironment() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return strpos($host, 'localhost') !== false || 
           strpos($host, '127.0.0.1') !== false ||
           strpos($host, '[::1]') !== false;
}

// Set headers
header('Content-Type: application/json');
if (isLocalEnvironment()) {
    header('Access-Control-Allow-Origin: http://localhost');
} else {
    header('Access-Control-Allow-Origin: https://dev.stackovercash.site');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check if user is logged in
if (!isset($_SESSION['auth']['id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

// In a real application, you might fetch tips from a database
// For now, using static tips
$financial_tips = [
    ['title' => 'Save Regularly', 'subtitle' => 'Even small amounts add up over time.'],
    ['title' => 'Create a Budget', 'subtitle' => 'Track spending and identify savings areas.'],
    ['title' => 'Build an Emergency Fund', 'subtitle' => 'Cover unexpected expenses without debt.'],
    ['title' => 'Invest Early', 'subtitle' => 'Compound interest works best over longer periods.'],
    ['title' => 'Reduce Unnecessary Expenses', 'subtitle' => 'Cut back on non-essentials to save more.'],
];

// Select a random tip for variety
$random_tip = $financial_tips[array_rand($financial_tips)];

echo json_encode([
    'success' => true,
    'tip' => $random_tip
]);

?> 
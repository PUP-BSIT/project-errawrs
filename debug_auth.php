<?php
/**
 * Debug Authentication Script
 * 
 * This script helps debug authentication issues by testing the login endpoint
 * and showing detailed request/response information.
 */

// Configuration
$BASE_URL = 'http://localhost:8000/api';

// Test data
$testData = [
    'username' => 'danielvictorioso',
    'password' => 'mCmVHxZFrGxftEbV',
    'login_type' => 'user'
];

echo "🔍 DEBUGGING AUTHENTICATION\n";
echo str_repeat("=", 50) . "\n";
echo "Base URL: $BASE_URL\n";
echo "Test Data: " . json_encode($testData, JSON_PRETTY_PRINT) . "\n\n";

// Test the authentication endpoint
$url = $BASE_URL . '/auth/login';

echo "📡 Making request to: $url\n";
echo "Method: POST\n";
echo "Data: " . json_encode($testData) . "\n\n";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_TIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($testData)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
$info = curl_getinfo($ch);
curl_close($ch);

echo "📊 RESPONSE DETAILS:\n";
echo str_repeat("-", 30) . "\n";
echo "HTTP Code: $httpCode\n";
echo "cURL Error: " . ($error ?: 'None') . "\n";
echo "Total Time: " . $info['total_time'] . " seconds\n";
echo "URL: " . $info['url'] . "\n\n";

if ($error) {
    echo "❌ cURL Error: $error\n";
    exit(1);
}

// Parse response
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

echo "📋 RESPONSE HEADERS:\n";
echo str_repeat("-", 30) . "\n";
echo $header . "\n";

echo "📄 RESPONSE BODY:\n";
echo str_repeat("-", 30) . "\n";
echo $body . "\n\n";

// Try to parse JSON
$jsonResponse = json_decode($body, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo "✅ JSON Response (parsed):\n";
    echo json_encode($jsonResponse, JSON_PRETTY_PRINT) . "\n\n";
} else {
    echo "❌ JSON Parse Error: " . json_last_error_msg() . "\n";
    echo "Raw body length: " . strlen($body) . " characters\n";
}

// Check if it's a successful response
if ($httpCode >= 200 && $httpCode < 300) {
    echo "✅ SUCCESS: HTTP $httpCode\n";
    if (isset($jsonResponse['token'])) {
        echo "✅ Token found: " . substr($jsonResponse['token'], 0, 20) . "...\n";
    } else {
        echo "⚠️  No token in response\n";
    }
} else {
    echo "❌ FAILED: HTTP $httpCode\n";
    if (isset($jsonResponse['error'])) {
        echo "Error: " . $jsonResponse['error'] . "\n";
    }
}

echo "\n" . str_repeat("=", 50) . "\n"; 
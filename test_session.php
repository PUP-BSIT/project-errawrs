<?php
/**
 * Test Session Management
 */

require_once __DIR__ . '/src/config/SessionManager.php';

echo "🔍 Testing Session Management\n";
echo str_repeat("=", 50) . "\n";

// Test 1: Create SessionManager instance
echo "1. Creating SessionManager instance...\n";
$session = SessionManager::getInstance();
echo "✅ SessionManager created successfully\n\n";

// Test 2: Initialize session
echo "2. Initializing session...\n";
$session->initSession();
echo "✅ Session initialized\n";
echo "Session ID: " . session_id() . "\n";
echo "Session name: " . session_name() . "\n\n";

// Test 3: Test authentication check
echo "3. Testing authentication check...\n";
$isAuth = $session->isAuthenticated();
echo "Is authenticated: " . ($isAuth ? 'Yes' : 'No') . "\n\n";

// Test 4: Test OTP storage
echo "4. Testing OTP storage...\n";
$otpStored = $session->storeOTP('123456', '+639918454024', 'test');
echo "OTP stored: " . ($otpStored ? 'Yes' : 'No') . "\n";
echo "Session data: " . print_r($_SESSION, true) . "\n\n";

// Test 5: Test OTP verification
echo "5. Testing OTP verification...\n";
$otpVerified = $session->verifyOTP('123456', '+639918454024', 'test');
echo "OTP verified: " . ($otpVerified ? 'Yes' : 'No') . "\n\n";

echo "✅ Session management test completed\n"; 
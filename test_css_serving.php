<?php
/**
 * Test CSS Serving
 * 
 * This script tests if CSS files are being served correctly through the router.
 */

// Load the Router class
require_once __DIR__ . '/src/core/Router.php';

// Create router instance
$router = new Router();

// Load web routes
$webRoutes = require __DIR__ . '/routes/web.php';

// Test CSS file paths
$testPaths = [
    '/css/styles.css',
    '/user/css/styles.css',
    '/admin/css/dashboard.css',
    '/teller/css/bank_teller_login.css'
];

echo "Testing CSS file serving:\n";
echo "========================\n\n";

foreach ($testPaths as $path) {
    echo "Testing: $path\n";
    
    // Simulate the request
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_SERVER['REQUEST_URI'] = $path;
    
    // Capture output
    ob_start();
    
    try {
        $router->dispatch('GET', $path);
        $output = ob_get_contents();
        
        if (strpos($output, 'CSS file not found') !== false) {
            echo "❌ FAILED: CSS file not found\n";
        } elseif (strpos($output, 'Route not found') !== false) {
            echo "❌ FAILED: Route not found\n";
        } elseif (empty($output)) {
            echo "❌ FAILED: No output\n";
        } else {
            echo "✅ SUCCESS: CSS content served (" . strlen($output) . " bytes)\n";
        }
    } catch (Exception $e) {
        echo "❌ ERROR: " . $e->getMessage() . "\n";
    }
    
    ob_end_clean();
    echo "\n";
}

// Test if routes are registered
echo "Checking registered routes:\n";
echo "==========================\n";
$routes = $router->getRoutes();
$cssRoutes = array_filter($routes, function($route) {
    return strpos($route['path'], 'css') !== false;
});

foreach ($cssRoutes as $route) {
    echo "Route: {$route['method']} {$route['prefix']}{$route['path']}\n";
}

echo "\nTest completed.\n";
?> 
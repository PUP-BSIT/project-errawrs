<?php
/**
 * Web Route Tester for ERRAWRS Banking System
 * 
 * This script tests all web routes with proper authentication,
 * session handling, and detailed reporting.
 * 
 * Usage: php test_web_routes.php [--verbose] [--base-url=URL]
 */

// Configuration
$CONFIG = [
    'base_url' => 'http://localhost:8000',
    'verbose' => false,
    'timeout' => 30,
    'max_retries' => 3
];

// Parse command line arguments
foreach ($argv as $arg) {
    if ($arg === '--verbose') $CONFIG['verbose'] = true;
    if (strpos($arg, '--base-url=') === 0) {
        $CONFIG['base_url'] = substr($arg, 12);
    }
}

// ANSI color codes for output
class Colors {
    const RED = "\033[31m";
    const GREEN = "\033[32m";
    const YELLOW = "\033[33m";
    const BLUE = "\033[34m";
    const MAGENTA = "\033[35m";
    const CYAN = "\033[36m";
    const WHITE = "\033[37m";
    const RESET = "\033[0m";
    const BOLD = "\033[1m";
}

// Web routes to test
$WEB_ROUTES = [
    // Public routes (no auth required)
    ['GET', '/'],
    ['GET', '/home'],
    ['GET', '/landing'],
    ['GET', '/about'],
    ['GET', '/contact'],
    ['GET', '/privacy-policy'],
    
    // Authentication routes
    ['GET', '/login'],
    ['GET', '/login/user'],
    ['GET', '/login/teller'],
    ['GET', '/login/admin'],
    ['GET', '/register'],
    ['GET', '/registration'],
    ['GET', '/forgot-password'],
    ['GET', '/forgot-username'],
    ['GET', '/reset-password'],
    
    // Asset routes
    ['GET', '/favicon.ico'],
    ['GET', '/images/favicon.ico'],
    
    // Protected routes (will be redirected to login)
    ['GET', '/user/dashboard'],
    ['GET', '/user/account'],
    ['GET', '/user/profile'],
    ['GET', '/user/transactions'],
    ['GET', '/user/transfer'],
    ['GET', '/user/transfer/success'],
    ['GET', '/user/transfer/failed'],
    
    ['GET', '/teller/dashboard'],
    ['GET', '/teller/search'],
    ['GET', '/teller/deposit'],
    ['GET', '/teller/withdraw'],
    ['GET', '/teller/history'],
    ['GET', '/teller/profile'],
    ['GET', '/teller/registrations'],
    ['GET', '/teller/set-password'],
    ['GET', '/teller/reset-password'],
    
    ['GET', '/admin/dashboard'],
    ['GET', '/admin/users'],
    ['GET', '/admin/tellers'],
    ['GET', '/admin/transactions'],
    
    // Non-existent routes (should return 404)
    ['GET', '/nonexistent-page'],
    ['GET', '/invalid/route/test'],
];

class WebRouteTester {
    private $config;
    private $results = [];
    
    public function __construct($config) {
        $this->config = $config;
    }
    
    public function log($message, $color = Colors::WHITE) {
        if ($this->config['verbose']) {
            echo $color . $message . Colors::RESET . "\n";
        }
    }
    
    public function testRoute($method, $path) {
        $url = $this->config['base_url'] . $path;
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_TIMEOUT => $this->config['timeout'],
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT => 'ERRAWRS-Web-Tester/1.0',
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.5',
                'Accept-Encoding: gzip, deflate',
                'Connection: keep-alive',
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        
        if ($error) {
            return [
                'success' => false,
                'error' => 'cURL Error: ' . $error,
                'http_code' => 0
            ];
        }
        
        // Parse response
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $header = substr($response, 0, $headerSize);
        $body = substr($response, $headerSize);
        
        return [
            'success' => $httpCode >= 200 && $httpCode < 400,
            'http_code' => $httpCode,
            'body' => $body,
            'content_type' => $contentType,
            'headers' => $header
        ];
    }
    
    public function testAllWebRoutes() {
        global $WEB_ROUTES;
        
        $this->log("🌐 Starting Web Route testing...", Colors::BOLD . Colors::BLUE);
        $this->log("Base URL: " . $this->config['base_url'], Colors::YELLOW);
        
        $total = count($WEB_ROUTES);
        $passed = 0;
        $failed = 0;
        $redirected = 0;
        
        foreach ($WEB_ROUTES as $index => $route) {
            $method = $route[0];
            $path = $route[1];
            
            $this->log("\n" . str_repeat("-", 60), Colors::WHITE);
            $this->log("Testing [" . ($index + 1) . "/$total]: $method $path", Colors::BOLD . Colors::WHITE);
            
            // Test the route
            $result = $this->testRoute($method, $path);
            
            // Store result
            $this->results[] = [
                'method' => $method,
                'path' => $path,
                'result' => $result
            ];
            
            // Report result
            if ($result['success']) {
                if ($result['http_code'] >= 300 && $result['http_code'] < 400) {
                    $this->log("🔄 REDIRECT - HTTP " . $result['http_code'], Colors::YELLOW);
                    $redirected++;
                } else {
                    $this->log("✅ PASS - HTTP " . $result['http_code'], Colors::GREEN);
                    $passed++;
                }
            } else {
                if ($result['http_code'] === 404) {
                    $this->log("❌ 404 - Page Not Found", Colors::RED);
                } else {
                    $this->log("❌ FAIL - HTTP " . $result['http_code'], Colors::RED);
                }
                $failed++;
            }
            
            // Show response details in verbose mode
            if ($this->config['verbose']) {
                $this->log("   Content-Type: " . $result['content_type'], Colors::CYAN);
                if (strlen($result['body']) > 200) {
                    $this->log("   Body: " . substr($result['body'], 0, 200) . "...", Colors::CYAN);
                } else {
                    $this->log("   Body: " . $result['body'], Colors::CYAN);
                }
            }
        }
        
        // Print summary
        $this->printSummary($total, $passed, $failed, $redirected);
        
        return $this->results;
    }
    
    private function printSummary($total, $passed, $failed, $redirected) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo Colors::BOLD . Colors::WHITE . "📊 WEB ROUTE TEST SUMMARY\n" . Colors::RESET;
        echo str_repeat("=", 60) . "\n";
        echo "Total Web Routes Tested: " . $total . "\n";
        echo Colors::GREEN . "✅ Passed: " . $passed . Colors::RESET . "\n";
        echo Colors::YELLOW . "🔄 Redirected: " . $redirected . Colors::RESET . "\n";
        echo Colors::RED . "❌ Failed: " . $failed . Colors::RESET . "\n";
        
        $successRate = $total > 0 ? round((($passed + $redirected) / $total) * 100, 1) : 0;
        echo "\nSuccess Rate: " . $successRate . "%\n";
        
        if ($failed > 0) {
            echo "\n" . Colors::RED . "Failed Web Routes:" . Colors::RESET . "\n";
            foreach ($this->results as $result) {
                if (!$result['result']['success']) {
                    echo "  " . $result['method'] . " " . $result['path'] . " (HTTP " . $result['result']['http_code'] . ")\n";
                }
            }
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
    }
}

// Run the web route tests
try {
    echo Colors::BOLD . Colors::MAGENTA . "🌐 WEB ROUTE TESTER\n" . Colors::RESET;
    echo str_repeat("=", 60) . "\n";
    
    $tester = new WebRouteTester($CONFIG);
    $results = $tester->testAllWebRoutes();
} catch (Exception $e) {
    echo Colors::RED . "❌ Web route test execution failed: " . $e->getMessage() . Colors::RESET . "\n";
    exit(1);
} 
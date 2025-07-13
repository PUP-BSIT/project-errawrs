<?php
/**
 * Web Route Tester with Authentication for ERRAWRS Banking System
 * 
 * This script tests all web routes including protected routes with proper authentication.
 * 
 * Usage: php test_web_routes_with_auth.php [--verbose] [--base-url=URL]
 */

// Configuration
$CONFIG = [
    'base_url' => 'http://localhost:8000',
    'verbose' => false,
    'timeout' => 30,
    'max_retries' => 3,
    'credentials' => [
        'user' => ['username' => 'testuser', 'password' => 'testpass123'],
        'teller' => ['tellerNumber' => 'T000001', 'password' => 'errawrs123'],
        'admin' => ['username' => 'admin', 'password' => 'admin123']
    ]
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
    ['GET', '/', 'public'],
    ['GET', '/home', 'public'],
    ['GET', '/landing', 'public'],
    ['GET', '/about', 'public'],
    ['GET', '/contact', 'public'],
    ['GET', '/privacy-policy', 'public'],
    
    // Authentication routes
    ['GET', '/login', 'public'],
    ['GET', '/login/user', 'public'],
    ['GET', '/login/teller', 'public'],
    ['GET', '/login/admin', 'public'],
    ['GET', '/register', 'public'],
    ['GET', '/registration', 'public'],
    ['GET', '/forgot-password', 'public'],
    ['GET', '/forgot-username', 'public'],
    ['GET', '/reset-password', 'public'],
    
    // User routes (should be protected)
    ['GET', '/user/dashboard', 'user'],
    ['GET', '/user/account', 'user'],
    ['GET', '/user/profile', 'user'],
    ['GET', '/user/transactions', 'user'],
    ['GET', '/user/transfer', 'user'],
    ['GET', '/user/transfer/success', 'user'],
    ['GET', '/user/transfer/failed', 'user'],
    
    // Teller routes (should be protected)
    ['GET', '/teller/dashboard', 'teller'],
    ['GET', '/teller/search', 'teller'],
    ['GET', '/teller/deposit', 'teller'],
    ['GET', '/teller/withdraw', 'teller'],
    ['GET', '/teller/history', 'teller'],
    ['GET', '/teller/profile', 'teller'],
    ['GET', '/teller/registrations', 'teller'],
    ['GET', '/teller/set-password', 'teller'],
    ['GET', '/teller/reset-password', 'teller'],
    
    // Admin routes (should be protected)
    ['GET', '/admin/dashboard', 'admin'],
    ['GET', '/admin/users', 'admin'],
    ['GET', '/admin/tellers', 'admin'],
    ['GET', '/admin/transactions', 'admin'],
];

class WebRouteTester {
    private $config;
    private $results = [];
    private $cookieJars = [];
    
    public function __construct($config) {
        $this->config = $config;
        // Initialize cookie jars for each user type
        $this->cookieJars = [
            'user' => tempnam(sys_get_temp_dir(), 'user_cookies_'),
            'teller' => tempnam(sys_get_temp_dir(), 'teller_cookies_'),
            'admin' => tempnam(sys_get_temp_dir(), 'admin_cookies_')
        ];
    }
    
    public function log($message, $color = Colors::WHITE) {
        if ($this->config['verbose']) {
            echo $color . $message . Colors::RESET . "\n";
        }
    }
    
    public function authenticate($userType) {
        if ($userType === 'public') {
            return true;
        }
        
        $credentials = $this->config['credentials'][$userType];
        $loginUrl = $this->config['base_url'] . '/login/' . $userType;
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $loginUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($credentials),
            CURLOPT_COOKIEJAR => $this->cookieJars[$userType],
            CURLOPT_COOKIEFILE => $this->cookieJars[$userType],
            CURLOPT_TIMEOUT => $this->config['timeout'],
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'User-Agent: ERRAWRS-Web-Tester/1.0'
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return $httpCode >= 200 && $httpCode < 400;
    }
    
    public function testRoute($method, $path, $userType) {
        $url = $this->config['base_url'] . $path;
        
        $ch = curl_init();
        $options = [
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
        ];
        
        // Add cookies if authenticated
        if ($userType !== 'public' && file_exists($this->cookieJars[$userType])) {
            $options[CURLOPT_COOKIEFILE] = $this->cookieJars[$userType];
        }
        
        curl_setopt_array($ch, $options);
        
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
        
        $this->log("🌐 Starting Web Route testing with authentication...", Colors::BOLD . Colors::BLUE);
        $this->log("Base URL: " . $this->config['base_url'], Colors::YELLOW);
        
        $total = count($WEB_ROUTES);
        $passed = 0;
        $failed = 0;
        $redirected = 0;
        $blocked = 0;
        
        // Test public routes first
        foreach ($WEB_ROUTES as $index => $route) {
            $method = $route[0];
            $path = $route[1];
            $userType = $route[2];
            
            $this->log("\n" . str_repeat("-", 60), Colors::WHITE);
            $this->log("Testing [" . ($index + 1) . "/$total]: $method $path ($userType)", Colors::BOLD . Colors::WHITE);
            
            // Authenticate if needed
            if ($userType !== 'public') {
                $this->log("   Authenticating as $userType...", Colors::CYAN);
                if (!$this->authenticate($userType)) {
                    $this->log("   ❌ Authentication failed for $userType", Colors::RED);
                    $failed++;
                    continue;
                }
                $this->log("   ✅ Authenticated as $userType", Colors::GREEN);
            }
            
            // Test the route
            $result = $this->testRoute($method, $path, $userType);
            
            // Store result
            $this->results[] = [
                'method' => $method,
                'path' => $path,
                'user_type' => $userType,
                'result' => $result
            ];
            
            // Report result
            if ($result['success']) {
                if ($result['http_code'] >= 300 && $result['http_code'] < 400) {
                    $this->log("   🔄 REDIRECT - HTTP " . $result['http_code'], Colors::YELLOW);
                    $redirected++;
                } else {
                    $this->log("   ✅ PASS - HTTP " . $result['http_code'], Colors::GREEN);
                    $passed++;
                }
            } else {
                if ($result['http_code'] === 404) {
                    if ($userType === 'public') {
                        $this->log("   ❌ 404 - Page Not Found", Colors::RED);
                    } else {
                        $this->log("   🚫 BLOCKED - Access Denied (404)", Colors::YELLOW);
                        $blocked++;
                    }
                } else {
                    $this->log("   ❌ FAIL - HTTP " . $result['http_code'], Colors::RED);
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
        
        // Clean up cookie files
        foreach ($this->cookieJars as $cookieFile) {
            if (file_exists($cookieFile)) {
                unlink($cookieFile);
            }
        }
        
        // Print summary
        $this->printSummary($total, $passed, $failed, $redirected, $blocked);
        
        return $this->results;
    }
    
    private function printSummary($total, $passed, $failed, $redirected, $blocked) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo Colors::BOLD . Colors::WHITE . "📊 WEB ROUTE TEST SUMMARY (WITH AUTH)\n" . Colors::RESET;
        echo str_repeat("=", 60) . "\n";
        echo "Total Web Routes Tested: " . $total . "\n";
        echo Colors::GREEN . "✅ Passed: " . $passed . Colors::RESET . "\n";
        echo Colors::YELLOW . "🔄 Redirected: " . $redirected . Colors::RESET . "\n";
        echo Colors::YELLOW . "🚫 Blocked (Expected): " . $blocked . Colors::RESET . "\n";
        echo Colors::RED . "❌ Failed: " . $failed . Colors::RESET . "\n";
        
        $successRate = $total > 0 ? round((($passed + $redirected) / $total) * 100, 1) : 0;
        echo "\nSuccess Rate: " . $successRate . "%\n";
        
        if ($failed > 0) {
            echo "\n" . Colors::RED . "Failed Web Routes:" . Colors::RESET . "\n";
            foreach ($this->results as $result) {
                if (!$result['result']['success']) {
                    echo "  " . $result['method'] . " " . $result['path'] . " (" . $result['user_type'] . ") - HTTP " . $result['result']['http_code'] . "\n";
                }
            }
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
    }
}

// Run the web route tests
try {
    echo Colors::BOLD . Colors::MAGENTA . "🌐 WEB ROUTE TESTER (WITH AUTHENTICATION)\n" . Colors::RESET;
    echo str_repeat("=", 60) . "\n";
    
    $tester = new WebRouteTester($CONFIG);
    $results = $tester->testAllWebRoutes();
} catch (Exception $e) {
    echo Colors::RED . "❌ Web route test execution failed: " . $e->getMessage() . Colors::RESET . "\n";
    exit(1);
} 
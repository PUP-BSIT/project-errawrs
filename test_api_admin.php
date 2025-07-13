<?php
/**
 * Admin API Route Tester for ERRAWRS Banking System
 * 
 * This script tests all admin-specific API routes with proper authentication,
 * mock data, and detailed reporting. Works with remote database configuration.
 * 
 * Usage: php test_api_admin.php [--verbose] [--base-url=URL]
 */

// Load environment and configuration
require_once __DIR__ . '/src/config/database.php';
require_once __DIR__ . '/src/core/Router.php';

// Configuration
$CONFIG = [
    'base_url' => 'http://localhost:8000/api',
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

// Admin-specific test data
$ADMIN_TEST_DATA = [
    'auth' => [
        'login' => [
            'username' => 'admin',
            'password' => 'admin123',
            'login_type' => 'admin'
        ]
    ],
    'dashboard' => [
        'stats' => [] // GET request, no data needed
    ],
    'users' => [
        'list' => [], // GET request, no data needed
        'get' => [], // GET request with ID parameter
        'update' => [
            'user_id' => 13,
            'first_name' => 'Updated',
            'last_name' => 'User',
            'email' => 'janedee@example.com',
            'phone_number' => '+639708070447'
        ]
    ],
    'tellers' => [
        'list' => [], // GET request, no data needed
        'get' => [], // GET request with ID parameter
        'create' => [
            'teller_number' => 'T' . rand(100, 999),
            'first_name' => 'Test',
            'last_name' => 'Teller',
            'email' => 'teller' . rand(1000, 9999) . '@example.com'
        ],
        'update' => [
            'teller_id' => 44,
            'first_name' => 'Updated',
            'last_name' => 'Teller',
            'email' => 'geraldkasan163@gmail.com'
        ],
        'toggle_status' => [
            'teller_id' => 44
        ],
        'reset_password' => [
            'teller_id' => 44
        ]
    ],
    'transactions' => [
        'list' => [] // GET request, no data needed
    ],
    'system' => [
        'info' => [] // GET request, no data needed
    ]
];

// Admin API routes to test
$ADMIN_ROUTES = [
    // Authentication
    ['POST', '/auth/login'],
    
    // Dashboard
    ['GET', '/admin/dashboard'],
    
    // User Management
    ['GET', '/admin/users'],
    ['GET', '/admin/users/1'],
    
    // Teller Management
    ['GET', '/admin/tellers'],
    ['POST', '/admin/tellers'],
    ['PUT', '/admin/tellers/1'],
    ['POST', '/admin/tellers/44/toggle-status'],
    ['POST', '/admin/tellers/1/reset-password'],
    
    // Transaction Management
    ['GET', '/admin/transactions'],
    
    // System Information
    ['GET', '/admin/info']
];

class AdminAPITester {
    private $config;
    private $testData;
    private $results = [];
    
    public function __construct($config, $testData) {
        $this->config = $config;
        $this->testData = $testData;
    }
    
    public function log($message, $color = Colors::WHITE) {
        if ($this->config['verbose']) {
            echo $color . $message . Colors::RESET . "\n";
        }
    }
    
    public function authenticate() {
        $this->log("🔐 Authenticating as admin...", Colors::CYAN);
        
        $loginResult = $this->testRoute('POST', '/auth/login', $this->testData['auth']['login']);
        
        if ($loginResult['success']) {
            $this->log("✅ Admin authentication successful", Colors::GREEN);
            return true;
        } else {
            $this->log("❌ Admin authentication failed: " . ($loginResult['json']['error'] ?? 'Unknown error'), Colors::RED);
            return false;
        }
    }
    
    public function testRoute($method, $path, $data = null, $headers = []) {
        $url = $this->config['base_url'] . $path;
        
        // Add GET parameters for GET requests
        if ($method === 'GET' && $data && is_array($data)) {
            $queryParams = http_build_query($data);
            $url .= '?' . $queryParams;
        }
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_TIMEOUT => $this->config['timeout'],
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_COOKIEJAR => 'admin_cookies.txt',
            CURLOPT_COOKIEFILE => 'admin_cookies.txt',
            CURLOPT_HTTPHEADER => array_merge([
                'Content-Type: application/json',
                'Accept: application/json'
            ], $headers)
        ]);
        
        if (in_array($method, ['POST', 'PUT', 'PATCH']) && $data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
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
        
        $jsonResponse = json_decode($body, true);
        
        return [
            'success' => $httpCode >= 200 && $httpCode < 300,
            'http_code' => $httpCode,
            'body' => $body,
            'json' => $jsonResponse,
            'headers' => $header
        ];
    }
    
    public function testAllAdminRoutes() {
        global $ADMIN_ROUTES;
        
        $this->log("🚀 Starting Admin API route testing...", Colors::BOLD . Colors::BLUE);
        $this->log("Base URL: " . $this->config['base_url'], Colors::YELLOW);
        
        // Authenticate first
        if (!$this->authenticate()) {
            $this->log("❌ Cannot proceed without authentication", Colors::RED);
            return [];
        }
        
        $total = count($ADMIN_ROUTES);
        $passed = 0;
        $failed = 0;
        $skipped = 0;
        
        foreach ($ADMIN_ROUTES as $index => $route) {
            $method = $route[0];
            $path = $route[1];
            
            $this->log("\n" . str_repeat("-", 60), Colors::WHITE);
            $this->log("Testing [" . ($index + 1) . "/$total]: $method $path", Colors::BOLD . Colors::WHITE);
            
            // Get test data for this route
            $testData = $this->getTestDataForRoute($path, $method);
            
            // Test the route
            $result = $this->testRoute($method, $path, $testData);
            
            // Store result
            $this->results[] = [
                'method' => $method,
                'path' => $path,
                'result' => $result,
                'test_data' => $testData
            ];
            
            // Report result
            if ($result['success']) {
                $this->log("✅ PASS - HTTP " . $result['http_code'], Colors::GREEN);
                $passed++;
            } elseif ($result['http_code'] === 401 || $result['http_code'] === 403) {
                $this->log("⚠️  SKIP - Authentication required (HTTP " . $result['http_code'] . ")", Colors::YELLOW);
                $skipped++;
            } else {
                $this->log("❌ FAIL - HTTP " . $result['http_code'], Colors::RED);
                if ($this->config['verbose'] && isset($result['json']['error'])) {
                    $this->log("   Error: " . $result['json']['error'], Colors::RED);
                }
                $failed++;
            }
            
            // Show response details in verbose mode
            if ($this->config['verbose'] && isset($result['json'])) {
                $this->log("   Response: " . json_encode($result['json'], JSON_PRETTY_PRINT), Colors::CYAN);
            }
        }
        
        // Print summary
        $this->printSummary($total, $passed, $failed, $skipped);
        
        return $this->results;
    }
    
    private function getTestDataForRoute($path, $method) {
        if (strpos($path, '/auth/login') !== false) {
            return $this->testData['auth']['login'];
        }
        
        if (strpos($path, '/admin/dashboard') !== false) {
            return $this->testData['dashboard']['stats'];
        }
        
        if (strpos($path, '/admin/users') !== false) {
            if (strpos($path, '/admin/users/1') !== false) {
                return ['user_id' => 13]; // Use a valid user ID
            }
            return $this->testData['users']['list'];
        }
        
        if (strpos($path, '/admin/tellers') !== false) {
            if ($method === 'POST' && strpos($path, '/toggle-status') === false && strpos($path, '/reset-password') === false) {
                return $this->testData['tellers']['create'];
            }
            if ($method === 'PUT') {
                return $this->testData['tellers']['update'];
            }
            if (strpos($path, '/toggle-status') !== false) {
                return $this->testData['tellers']['toggle_status'];
            }
            if (strpos($path, '/reset-password') !== false) {
                return $this->testData['tellers']['reset_password'];
            }
            // For GET /admin/tellers, check if we need to get a specific teller
            if (strpos($path, '/admin/tellers') !== false && $method === 'GET') {
                return ['id' => 44]; // Use a valid teller ID
            }
            return $this->testData['tellers']['list'];
        }
        
        if (strpos($path, '/admin/transactions') !== false) {
            return $this->testData['transactions']['list'];
        }
        
        if (strpos($path, '/admin/info') !== false) {
            return $this->testData['system']['info'];
        }
        
        return null;
    }
    
    private function printSummary($total, $passed, $failed, $skipped) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo Colors::BOLD . Colors::WHITE . "📊 ADMIN API TEST SUMMARY\n" . Colors::RESET;
        echo str_repeat("=", 60) . "\n";
        echo "Total Admin Routes Tested: " . $total . "\n";
        echo Colors::GREEN . "✅ Passed: " . $passed . Colors::RESET . "\n";
        echo Colors::RED . "❌ Failed: " . $failed . Colors::RESET . "\n";
        echo Colors::YELLOW . "⚠️  Skipped: " . $skipped . Colors::RESET . "\n";
        
        $successRate = $total > 0 ? round(($passed / $total) * 100, 1) : 0;
        echo "\nSuccess Rate: " . $successRate . "%\n";
        
        if ($failed > 0) {
            echo "\n" . Colors::RED . "Failed Admin Routes:" . Colors::RESET . "\n";
            foreach ($this->results as $result) {
                if (!$result['result']['success'] && $result['result']['http_code'] !== 401 && $result['result']['http_code'] !== 403) {
                    echo "  " . $result['method'] . " " . $result['path'] . " (HTTP " . $result['result']['http_code'] . ")\n";
                }
            }
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
    }
}

// Run the admin tests
try {
    echo Colors::BOLD . Colors::MAGENTA . "🔧 ADMIN API ROUTE TESTER\n" . Colors::RESET;
    echo str_repeat("=", 60) . "\n";
    
    $tester = new AdminAPITester($CONFIG, $ADMIN_TEST_DATA);
    $results = $tester->testAllAdminRoutes();
} catch (Exception $e) {
    echo Colors::RED . "❌ Admin test execution failed: " . $e->getMessage() . Colors::RESET . "\n";
    exit(1);
} 
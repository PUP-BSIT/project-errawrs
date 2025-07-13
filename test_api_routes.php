<?php
/**
 * Comprehensive API Route Tester for ERRAWRS Banking System
 * 
 * This script tests all API routes with proper authentication, mock data,
 * and detailed reporting. Works with remote database configuration.
 * 
 * Usage: php test_api_routes.php [--verbose] [--auth] [--base-url=URL]
 */

// Load environment and configuration
require_once __DIR__ . '/src/config/database.php';
require_once __DIR__ . '/src/core/Router.php';

// Configuration
$CONFIG = [
    'base_url' => 'http://localhost/project-errawrs/api',
    'verbose' => false,
    'test_auth' => false,
    'timeout' => 30,
    'max_retries' => 3
];

// Parse command line arguments
foreach ($argv as $arg) {
    if ($arg === '--verbose') $CONFIG['verbose'] = true;
    if ($arg === '--auth') $CONFIG['test_auth'] = true;
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

// Test data for different endpoints
$TEST_DATA = [
    'auth' => [
        'login_user' => [
            'username' => 'testuser',
            'password' => 'password123',
            'login_type' => 'user'
        ],
        'login_teller' => [
            'teller_number' => 'T001',
            'password' => 'password123',
            'login_type' => 'teller'
        ],
        'login_admin' => [
            'username' => 'admin',
            'password' => 'admin123',
            'login_type' => 'admin'
        ]
    ],
    'user' => [
        'register' => [
            'username' => 'testuser' . rand(1000, 9999),
            'password' => 'password123',
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test' . rand(1000, 9999) . '@example.com',
            'phone_number' => '09123456789',
            'national_id' => 'ID123456789',
            'address' => '123 Test Street, Test City'
        ],
        'transfer' => [
            'from_account_id' => 1,
            'to_account_id' => 2,
            'amount' => 100,
            'description' => 'Test transfer'
        ],
        'profile' => [
            'first_name' => 'Updated',
            'last_name' => 'Name',
            'email' => 'updated@example.com',
            'phone_number' => '09876543210'
        ]
    ],
    'teller' => [
        'deposit' => [
            'account_id' => 1,
            'amount' => 500,
            'description' => 'Test deposit'
        ],
        'withdraw' => [
            'account_id' => 1,
            'amount' => 100,
            'description' => 'Test withdrawal'
        ],
        'search_account' => [
            'account_number' => '1234567890'
        ]
    ],
    'admin' => [
        'create_teller' => [
            'teller_number' => 'T' . rand(100, 999),
            'first_name' => 'Test',
            'last_name' => 'Teller',
            'email' => 'teller' . rand(1000, 9999) . '@example.com'
        ]
    ],
    'public' => [
        'contact' => [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'subject' => 'Test Contact',
            'message' => 'This is a test message'
        ]
    ]
];

// Authentication tokens storage
$AUTH_TOKENS = [];

class APITester {
    private $config;
    private $testData;
    private $authTokens;
    private $results = [];
    
    public function __construct($config, $testData) {
        $this->config = $config;
        $this->testData = $testData;
        $this->authTokens = [];
    }
    
    public function log($message, $color = Colors::WHITE) {
        if ($this->config['verbose']) {
            echo $color . $message . Colors::RESET . "\n";
        }
    }
    
    public function testRoute($method, $path, $data = null, $headers = []) {
        $url = $this->config['base_url'] . $path;
        
        // Add authentication headers if available
        if (isset($this->authTokens['user']) && strpos($path, '/user/') === 0) {
            $headers['Authorization'] = 'Bearer ' . $this->authTokens['user'];
        } elseif (isset($this->authTokens['teller']) && strpos($path, '/teller/') === 0) {
            $headers['Authorization'] = 'Bearer ' . $this->authTokens['teller'];
        } elseif (isset($this->authTokens['admin']) && strpos($path, '/admin/') === 0) {
            $headers['Authorization'] = 'Bearer ' . $this->authTokens['admin'];
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
    
    public function authenticate() {
        if (!$this->config['test_auth']) return;
        
        $this->log("🔐 Testing authentication...", Colors::CYAN);
        
        // Test user login
        $userLogin = $this->testRoute('POST', '/auth/login', $this->testData['auth']['login_user']);
        if ($userLogin['success'] && isset($userLogin['json']['token'])) {
            $this->authTokens['user'] = $userLogin['json']['token'];
            $this->log("✅ User authentication successful", Colors::GREEN);
        } else {
            $this->log("❌ User authentication failed: " . ($userLogin['json']['error'] ?? 'Unknown error'), Colors::RED);
        }
        
        // Test teller login
        $tellerLogin = $this->testRoute('POST', '/auth/login', $this->testData['auth']['login_teller']);
        if ($tellerLogin['success'] && isset($tellerLogin['json']['token'])) {
            $this->authTokens['teller'] = $tellerLogin['json']['token'];
            $this->log("✅ Teller authentication successful", Colors::GREEN);
        } else {
            $this->log("❌ Teller authentication failed: " . ($tellerLogin['json']['error'] ?? 'Unknown error'), Colors::RED);
        }
        
        // Test admin login
        $adminLogin = $this->testRoute('POST', '/auth/login', $this->testData['auth']['login_admin']);
        if ($adminLogin['success'] && isset($adminLogin['json']['token'])) {
            $this->authTokens['admin'] = $adminLogin['json']['token'];
            $this->log("✅ Admin authentication successful", Colors::GREEN);
        } else {
            $this->log("❌ Admin authentication failed: " . ($adminLogin['json']['error'] ?? 'Unknown error'), Colors::RED);
        }
    }
    
    public function testAllRoutes() {
        $router = require __DIR__ . '/routes/api.php';
        $routes = $router->getRoutes();
        
        $this->log("🚀 Starting API route testing...", Colors::BOLD . Colors::BLUE);
        $this->log("Base URL: " . $this->config['base_url'], Colors::YELLOW);
        
        // Authenticate first if requested
        $this->authenticate();
        
        $total = count($routes);
$passed = 0;
        $failed = 0;
        $skipped = 0;
        
        foreach ($routes as $index => $route) {
            $method = $route['method'];
            $path = $route['prefix'] . $route['path'];
            
            // Replace route parameters with test values
            $path = preg_replace('/\{[^}]+\}/', '1', $path);
            
            $this->log("\n" . str_repeat("-", 60), Colors::WHITE);
            $this->log("Testing [" . ($index + 1) . "/$total]: $method $path", Colors::BOLD . Colors::WHITE);
            
            // Determine test data based on route
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
        // Determine appropriate test data based on route path and method
        if (strpos($path, '/auth/login') !== false) {
            if (strpos($path, '/teller') !== false) {
                return $this->testData['auth']['login_teller'];
            } elseif (strpos($path, '/admin') !== false) {
                return $this->testData['auth']['login_admin'];
    } else {
                return $this->testData['auth']['login_user'];
            }
        }
        
        if (strpos($path, '/user/register') !== false) {
            return $this->testData['user']['register'];
        }
        
        if (strpos($path, '/user/transactions/transfer') !== false) {
            return $this->testData['user']['transfer'];
        }
        
        if (strpos($path, '/user/profile') !== false && $method === 'PUT') {
            return $this->testData['user']['profile'];
        }
        
        if (strpos($path, '/teller/deposit') !== false) {
            return $this->testData['teller']['deposit'];
        }
        
        if (strpos($path, '/teller/withdraw') !== false) {
            return $this->testData['teller']['withdraw'];
        }
        
        if (strpos($path, '/teller/search-account') !== false) {
            return $this->testData['teller']['search_account'];
        }
        
        if (strpos($path, '/admin/tellers') !== false && $method === 'POST') {
            return $this->testData['admin']['create_teller'];
        }
        
        if (strpos($path, '/public/contact') !== false) {
            return $this->testData['public']['contact'];
        }
        
        return null;
    }
    
    private function printSummary($total, $passed, $failed, $skipped) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo Colors::BOLD . Colors::WHITE . "📊 API TEST SUMMARY\n" . Colors::RESET;
        echo str_repeat("=", 60) . "\n";
        echo "Total Routes Tested: " . $total . "\n";
        echo Colors::GREEN . "✅ Passed: " . $passed . Colors::RESET . "\n";
        echo Colors::RED . "❌ Failed: " . $failed . Colors::RESET . "\n";
        echo Colors::YELLOW . "⚠️  Skipped: " . $skipped . Colors::RESET . "\n";
        
        $successRate = $total > 0 ? round(($passed / $total) * 100, 1) : 0;
        echo "\nSuccess Rate: " . $successRate . "%\n";
        
        if ($failed > 0) {
            echo "\n" . Colors::RED . "Failed Routes:" . Colors::RESET . "\n";
            foreach ($this->results as $result) {
                if (!$result['result']['success'] && $result['result']['http_code'] !== 401 && $result['result']['http_code'] !== 403) {
                    echo "  " . $result['method'] . " " . $result['path'] . " (HTTP " . $result['result']['http_code'] . ")\n";
                }
            }
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
    }
}

// Run the tests
try {
    $tester = new APITester($CONFIG, $TEST_DATA);
    $results = $tester->testAllRoutes();
} catch (Exception $e) {
    echo Colors::RED . "❌ Test execution failed: " . $e->getMessage() . Colors::RESET . "\n";
    exit(1);
}
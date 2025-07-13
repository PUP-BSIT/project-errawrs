<?php
/**
 * Teller API Route Tester for ERRAWRS Banking System
 * 
 * This script tests all teller-specific API routes with proper authentication,
 * mock data, and detailed reporting. Works with remote database configuration.
 * 
 * Usage: php test_api_teller.php [--verbose] [--base-url=URL]
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

// Teller-specific test data
$TELLER_TEST_DATA = [
    'auth' => [
        'login' => [
            'teller_number' => 'T000001',
            'password' => 'errawrs123',
            'login_type' => 'teller'
        ],
        'set_password' => [
            'teller_email' => 'geraldkasan163@gmail.com',
            'password' => 'newpassword123'
        ],
        'reset_password' => [
            'email' => 'geraldkasan163@gmail.com'
        ]
    ],
    'account_operations' => [
        'search_account' => [
            'search' => '544250000001',
            'teller_number' => 'T000001'
        ],
        'deposit' => [
            'account_number' => '544250000001',
            'amount' => 500,
            'description' => 'Test deposit',
            'teller_number' => 'T000001'
        ],
        'withdraw' => [
            'account_number' => '544250000001',
            'amount' => 100,
            'description' => 'Test withdrawal',
            'teller_number' => 'T000001'
        ],
        'close_account' => [
            'account_number' => '544250000004',
            'reason' => 'Test account closure',
            'teller_number' => 'T000001'
        ],
        'reopen_account' => [
            'account_number' => '544250000004',
            'reason' => 'Test account reopening',
            'teller_number' => 'T000001'
        ]
    ],
    'registration_management' => [
        'list_registrations' => [], // GET request, no data needed
        'review_registration' => [
            'registration_id' => 31,
            'action' => 'approve',
            'notes' => 'Test approval',
            'teller_number' => 'T000001'
        ]
    ],
    'transactions' => [
        'history' => [
            'teller_number' => 'T000001'
        ], // GET request with teller_number parameter
        'search_history' => [
            'teller_number' => 'T000001',
            'account_number' => '544250000001',
            'date_from' => '2024-01-01',
            'date_to' => '2024-12-31'
        ]
    ],
    'dashboard' => [
        'summary' => [] // GET request, no data needed
    ],
    'profile' => [
        'view' => [
            'teller_number' => 'T000001'
        ], // GET request with teller_number
        'update' => [
            'teller_number' => 'T000001',
            'first_name' => 'Updated',
            'last_name' => 'Teller',
            'email_address' => 'geraldkasan163@gmail.com'
        ]
    ]
];

// Teller API routes to test
$TELLER_ROUTES = [
    // Authentication
    ['POST', '/auth/login'],
    ['POST', '/teller/reset-password'],
    
    // Account Operations
    ['GET', '/teller/search-account'],
    ['POST', '/teller/deposit'],
    ['POST', '/teller/withdraw'],
    ['POST', '/teller/close-account'],
    ['POST', '/teller/reopen-account'],
    
    // Registration Management
    ['GET', '/teller/registrations'],
    ['POST', '/teller/registrations/review'],
    
    // Transaction History
    ['GET', '/teller/transactions'],
    ['GET', '/teller/search-history'],
    
    // Dashboard
    ['GET', '/teller/dashboard'],
    
    // Profile Management
    ['GET', '/teller/profile'],
    ['PUT', '/teller/profile'],
    
    // Authentication (moved to end to avoid breaking other tests)
    ['POST', '/teller/set-password']
];

class TellerAPITester {
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
        $this->log("🔐 Authenticating as teller...", Colors::CYAN);
        
        $loginResult = $this->testRoute('POST', '/auth/login', $this->testData['auth']['login']);
        
        if ($loginResult['success']) {
            $this->log("✅ Teller authentication successful", Colors::GREEN);
            return true;
        } else {
            $this->log("❌ Teller authentication failed: " . ($loginResult['json']['error'] ?? 'Unknown error'), Colors::RED);
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
            CURLOPT_COOKIEJAR => 'teller_cookies.txt',
            CURLOPT_COOKIEFILE => 'teller_cookies.txt',
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
    
    public function testAllTellerRoutes() {
        global $TELLER_ROUTES;
        
        $this->log("🚀 Starting Teller API route testing...", Colors::BOLD . Colors::BLUE);
        $this->log("Base URL: " . $this->config['base_url'], Colors::YELLOW);
        
        // Authenticate first
        if (!$this->authenticate()) {
            $this->log("❌ Cannot proceed without authentication", Colors::RED);
            return [];
        }
        
        $total = count($TELLER_ROUTES);
        $passed = 0;
        $failed = 0;
        $skipped = 0;
        
        foreach ($TELLER_ROUTES as $index => $route) {
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
        
        if (strpos($path, '/teller/set-password') !== false) {
            return $this->testData['auth']['set_password'];
        }
        
        if (strpos($path, '/teller/reset-password') !== false) {
            return $this->testData['auth']['reset_password'];
        }
        
        if (strpos($path, '/teller/search-account') !== false) {
            return $this->testData['account_operations']['search_account'];
        }
        
        if (strpos($path, '/teller/deposit') !== false) {
            return $this->testData['account_operations']['deposit'];
        }
        
        if (strpos($path, '/teller/withdraw') !== false) {
            return $this->testData['account_operations']['withdraw'];
        }
        
        if (strpos($path, '/teller/close-account') !== false) {
            return $this->testData['account_operations']['close_account'];
        }
        
        if (strpos($path, '/teller/reopen-account') !== false) {
            return $this->testData['account_operations']['reopen_account'];
        }
        
        if (strpos($path, '/teller/registrations') !== false) {
            if ($method === 'POST') {
                return $this->testData['registration_management']['review_registration'];
            }
            return $this->testData['registration_management']['list_registrations'];
        }
        
        if (strpos($path, '/teller/transactions') !== false) {
            return $this->testData['transactions']['history'];
        }
        
        if (strpos($path, '/teller/search-history') !== false) {
            return $this->testData['transactions']['search_history'];
        }
        
        if (strpos($path, '/teller/dashboard') !== false) {
            return $this->testData['dashboard']['summary'];
        }
        
        if (strpos($path, '/teller/profile') !== false) {
            if ($method === 'PUT') {
                return $this->testData['profile']['update'];
            }
            return $this->testData['profile']['view'];
        }
        
        return null;
    }
    
    private function printSummary($total, $passed, $failed, $skipped) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo Colors::BOLD . Colors::WHITE . "📊 TELLER API TEST SUMMARY\n" . Colors::RESET;
        echo str_repeat("=", 60) . "\n";
        echo "Total Teller Routes Tested: " . $total . "\n";
        echo Colors::GREEN . "✅ Passed: " . $passed . Colors::RESET . "\n";
        echo Colors::RED . "❌ Failed: " . $failed . Colors::RESET . "\n";
        echo Colors::YELLOW . "⚠️  Skipped: " . $skipped . Colors::RESET . "\n";
        
        $successRate = $total > 0 ? round(($passed / $total) * 100, 1) : 0;
        echo "\nSuccess Rate: " . $successRate . "%\n";
        
        if ($failed > 0) {
            echo "\n" . Colors::RED . "Failed Teller Routes:" . Colors::RESET . "\n";
            foreach ($this->results as $result) {
                if (!$result['result']['success'] && $result['result']['http_code'] !== 401 && $result['result']['http_code'] !== 403) {
                    echo "  " . $result['method'] . " " . $result['path'] . " (HTTP " . $result['result']['http_code'] . ")\n";
                }
            }
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
    }
}

// Run the teller tests
try {
    echo Colors::BOLD . Colors::MAGENTA . "🏦 TELLER API ROUTE TESTER\n" . Colors::RESET;
    echo str_repeat("=", 60) . "\n";
    
    $tester = new TellerAPITester($CONFIG, $TELLER_TEST_DATA);
    $results = $tester->testAllTellerRoutes();
} catch (Exception $e) {
    echo Colors::RED . "❌ Teller test execution failed: " . $e->getMessage() . Colors::RESET . "\n";
    exit(1);
} 
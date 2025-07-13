<?php
/**
 * User API Route Tester for ERRAWRS Banking System
 * 
 * This script tests all user-specific API routes with proper authentication,
 * mock data, and detailed reporting. Works with remote database configuration.
 * 
 * Usage: php test_api_user.php [--verbose] [--base-url=URL]
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

// User-specific test data
$USER_TEST_DATA = [
    'auth' => [
        'login' => [
            'username' => 'danielvictorioso',
            'password' => 'mCmVHxZFrGxftEbV',
            'login_type' => 'user'
        ],
        'logout' => [], // POST request, no data needed
        'session_check' => [], // GET request, no data needed
        'kill_session' => [], // POST request, no data needed
        'send_otp' => [
            'phone_number' => '09876543210'
        ],
        'verify_otp' => [
            'phone_number' => '09876543210',
            'otp' => '123456',
            'purpose' => 'general'
        ],
        'request_password_reset' => [
            'phone_number' => '09876543210'
        ],
        'reset_password' => [
            'token' => 'mocktoken',
            'password' => 'newpassword123'
        ],
        'verify_reset_token' => [
            'token' => 'mocktoken'
        ],
        'forgot_username' => [
            'phone_number' => '09876543210'
        ]
    ],
    'registration' => [
        'submit' => [
            'username' => 'testuser' . rand(1000, 9999),
            'password' => 'password123',
            'confirm_password' => 'password123',
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test' . rand(1000, 9999) . '@example.com',
            'phone_number' => '+639123456789',
            'date_of_birth' => '1990-01-01',
            'nationality' => 'Filipino',
            'national_id' => 'ID123456789',
            'street' => '123 Test Street',
            'city' => 'Test City',
            'zip_code' => '1234',
            'country' => 'Philippines',
            'id_type' => 'passport',
            'id_number' => 'P123456789',
            'id_image' => '@/src/api/user/uploads/registration/10/10_national_id.jpg'
        ]
    ],
    'profile' => [
        'view' => [], // GET request, no data needed
        'update' => [
            'first_name' => 'Updated',
            'last_name' => 'User',
            'email' => 'updated@example.com',
            'phone_number' => '09876543210',
            'current_password' => 'mCmVHxZFrGxftEbV'
        ]
    ],
    'accounts' => [
        'list' => [], // GET request, no data needed
        'create' => [
            'account_type' => 'credit',
            'initial_deposit' => 1000
        ]
    ],
    'transactions' => [
        'list' => [], // GET request, no data needed
        'transfer' => [
            'transaction_amount' => 100,
            'source_account_no' => '544250000002',
            'recipient_account_no' => '544250000003',
            'description' => 'Test transfer'
        ],
        'external_transfer' => [
            'transaction_amount' => 50,
            'source_account_no' => '544250000002',
            'recipient_name' => 'External User',
            'recipient_account_no' => '9876543210',
            'recipient_bank_code' => 'Other Bank',
            'description' => 'External transfer',
            'redirect_url' => 'http://localhost:8000/user/transfer/success'
        ],
        'cancel' => [
            'transaction_id' => 1
        ],
        'success' => [
            'transaction_id' => 1
        ]
    ],
    'financial_tips' => [
        'get' => [] // GET request, no data needed
    ]
];

// User API routes to test
$USER_ROUTES = [
    // Authentication
    ['POST', '/auth/login'],
    ['POST', '/auth/send-otp'],
    ['POST', '/auth/verify-otp'],
    ['POST', '/auth/request-password-reset'],
    ['POST', '/auth/reset-password'],
    ['POST', '/auth/verify-reset-token'],
    ['POST', '/auth/forgot-username'],
    
    // Registration
    ['POST', '/user/register'],
    
    // Profile Management
    ['GET', '/user/profile'],
    ['PUT', '/user/profile'],
    
    // Account Management
    ['GET', '/user/accounts'],
    ['POST', '/user/accounts/create'],
    
    // Transaction Management
    ['GET', '/user/transactions'],
    ['POST', '/user/transactions/transfer'],
    ['POST', '/user/transactions/external-transfer'],
    ['POST', '/user/transactions/cancel'],
    ['GET', '/user/transactions/success'],
    
    // Financial Tips
    ['GET', '/user/financial-tips'],
    
    // Session management (moved to end)
    ['POST', '/auth/logout'],
    ['GET', '/auth/session-check'],
    ['POST', '/auth/kill-session']
];

class UserAPITester {
    private $config;
    private $testData;
    private $authToken;
    private $sessionCookie;
    private $results = [];
    private $cookieJarFile;
    
    public function __construct($config, $testData) {
        $this->config = $config;
        $this->testData = $testData;
        $this->authToken = null;
        $this->sessionCookie = null;
        $this->cookieJarFile = tempnam(sys_get_temp_dir(), 'errawrs_cookie_');
    }
    
    public function __destruct() {
        if ($this->cookieJarFile && file_exists($this->cookieJarFile)) {
            unlink($this->cookieJarFile);
        }
    }
    
    public function log($message, $color = Colors::WHITE) {
        if ($this->config['verbose']) {
            echo $color . $message . Colors::RESET . "\n";
        }
    }
    
    public function authenticate() {
        $this->log("🔐 Authenticating as user...", Colors::CYAN);
        
        $loginResult = $this->testRoute('POST', '/auth/login', $this->testData['auth']['login']);
        
        if ($loginResult['success']) {
            // Store session cookie for session-based authentication
            $this->sessionCookie = $this->extractSessionCookie($loginResult['headers']);
            $this->log("✅ User authentication successful", Colors::GREEN);
            return true;
        } else {
            $this->log("❌ User authentication failed: " . ($loginResult['json']['error'] ?? 'Unknown error'), Colors::RED);
            return false;
        }
    }
    
    private function extractSessionCookie($headers) {
        if (preg_match('/Set-Cookie: PHPSESSID=([^;]+)/', $headers, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    public function testRoute($method, $path, $data = null, $headers = []) {
        $url = $this->config['base_url'] . $path;
        
        // Add authentication header if available
        if ($this->authToken) {
            $headers['Authorization'] = 'Bearer ' . $this->authToken;
        }
        
        // Convert headers array to cURL format
        $curlHeaders = [];
        foreach ($headers as $key => $value) {
            $curlHeaders[] = "$key: $value";
        }
        
        // Special handling for registration file upload
        $isRegistration = ($path === '/user/register');
        if ($isRegistration && $data && isset($data['id_image'])) {
            // Use CURLFile for file upload
            $filePath = str_replace('@', '', $data['id_image']);
            if (file_exists(__DIR__ . $filePath)) {
                $data['id_image'] = new CURLFile(__DIR__ . $filePath);
            } else if (file_exists($filePath)) {
                $data['id_image'] = new CURLFile($filePath);
            } else {
                unset($data['id_image']); // fallback: skip file if not found
            }
            
            // Ensure all other fields are strings for multipart/form-data
            foreach ($data as $key => $value) {
                if ($key !== 'id_image' && !is_string($value)) {
                    $data[$key] = (string)$value;
                }
            }
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->config['timeout']);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_COOKIEJAR, $this->cookieJarFile);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $this->cookieJarFile);

        if ($data !== null) {
            if ($isRegistration) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            } else {
                curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge([
                    'Content-Type: application/json',
                    'Accept: application/json'
                ], $curlHeaders));
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } else {
            curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge([
                'Content-Type: application/json',
                'Accept: application/json'
            ], $curlHeaders));
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
    
    public function testAllUserRoutes() {
        global $USER_ROUTES;
        
        $this->log("🚀 Starting User API route testing...", Colors::BOLD . Colors::BLUE);
        $this->log("Base URL: " . $this->config['base_url'], Colors::YELLOW);
        
        // Authenticate first
        if (!$this->authenticate()) {
            $this->log("❌ Cannot proceed without authentication", Colors::RED);
            return [];
        }
        
        $total = count($USER_ROUTES);
        $passed = 0;
        $failed = 0;
        $skipped = 0;
        
        foreach ($USER_ROUTES as $index => $route) {
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
        
        if (strpos($path, '/auth/logout') !== false) {
            return $this->testData['auth']['logout'];
        }
        
        if (strpos($path, '/auth/session-check') !== false) {
            return $this->testData['auth']['session_check'];
        }
        
        if (strpos($path, '/auth/kill-session') !== false) {
            return $this->testData['auth']['kill_session'];
        }
        
        if (strpos($path, '/auth/send-otp') !== false) {
            return $this->testData['auth']['send_otp'];
        }
        
        if (strpos($path, '/auth/verify-otp') !== false) {
            return $this->testData['auth']['verify_otp'];
        }
        
        if (strpos($path, '/auth/request-password-reset') !== false) {
            return $this->testData['auth']['request_password_reset'];
        }
        
        if (strpos($path, '/auth/reset-password') !== false) {
            return $this->testData['auth']['reset_password'];
        }
        
        if (strpos($path, '/auth/verify-reset-token') !== false) {
            return $this->testData['auth']['verify_reset_token'];
        }
        
        if (strpos($path, '/auth/forgot-username') !== false) {
            return $this->testData['auth']['forgot_username'];
        }
        
        if (strpos($path, '/user/register') !== false) {
            return $this->testData['registration']['submit'];
        }
        
        if (strpos($path, '/user/profile') !== false) {
            if ($method === 'PUT') {
                return $this->testData['profile']['update'];
            }
            return $this->testData['profile']['view'];
        }
        
        if (strpos($path, '/user/accounts') !== false) {
            if ($method === 'POST') {
                return $this->testData['accounts']['create'];
            }
            return $this->testData['accounts']['list'];
        }
        
        if (strpos($path, '/user/transactions') !== false) {
            if (strpos($path, '/transfer') !== false) {
                return $this->testData['transactions']['transfer'];
            }
            if (strpos($path, '/external-transfer') !== false) {
                return $this->testData['transactions']['external_transfer'];
            }
            if (strpos($path, '/cancel') !== false) {
                return $this->testData['transactions']['cancel'];
            }
            if (strpos($path, '/success') !== false) {
                return $this->testData['transactions']['success'];
            }
            return $this->testData['transactions']['list'];
        }
        
        if (strpos($path, '/user/financial-tips') !== false) {
            return $this->testData['financial_tips']['get'];
        }
        
        return null;
    }
    
    private function printSummary($total, $passed, $failed, $skipped) {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo Colors::BOLD . Colors::WHITE . "📊 USER API TEST SUMMARY\n" . Colors::RESET;
        echo str_repeat("=", 60) . "\n";
        echo "Total User Routes Tested: " . $total . "\n";
        echo Colors::GREEN . "✅ Passed: " . $passed . Colors::RESET . "\n";
        echo Colors::RED . "❌ Failed: " . $failed . Colors::RESET . "\n";
        echo Colors::YELLOW . "⚠️  Skipped: " . $skipped . Colors::RESET . "\n";
        
        $successRate = $total > 0 ? round(($passed / $total) * 100, 1) : 0;
        echo "\nSuccess Rate: " . $successRate . "%\n";
        
        if ($failed > 0) {
            echo "\n" . Colors::RED . "Failed User Routes:" . Colors::RESET . "\n";
            foreach ($this->results as $result) {
                if (!$result['result']['success'] && $result['result']['http_code'] !== 401 && $result['result']['http_code'] !== 403) {
                    echo "  " . $result['method'] . " " . $result['path'] . " (HTTP " . $result['result']['http_code'] . ")\n";
                }
            }
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
    }
}

// Run the user tests
try {
    echo Colors::BOLD . Colors::MAGENTA . "👤 USER API ROUTE TESTER\n" . Colors::RESET;
    echo str_repeat("=", 60) . "\n";
    
    $tester = new UserAPITester($CONFIG, $USER_TEST_DATA);
    $results = $tester->testAllUserRoutes();
} catch (Exception $e) {
    echo Colors::RED . "❌ User test execution failed: " . $e->getMessage() . Colors::RESET . "\n";
    exit(1);
} 
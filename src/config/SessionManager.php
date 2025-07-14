<?php

class SessionManager {
    private static $instance = null;
    private $sessionTimeout;
    private $sessionRefreshTime;
    private $sessionWarnTime;
    private $isInitialized = false;

    private function __construct() {
        $this->sessionTimeout = 3600;      // 1 hour
        $this->sessionRefreshTime = 1800;  // 30 minutes
        $this->sessionWarnTime = 300;      // 5 minute warning
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new SessionManager();
        }
        return self::$instance;
    }

    public function initSession() {
        if ($this->isInitialized) {
            return;
        }

        if (session_status() === PHP_SESSION_NONE) {
            // Session configuration
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_only_cookies', 1);
            // Set cookie_secure dynamically: 1 for HTTPS, 0 for HTTP (localhost)
            $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
            ini_set('session.cookie_secure', $secure ? 1 : 0);
            ini_set('session.cookie_samesite', 'Lax');
            ini_set('session.gc_maxlifetime', 3600); // 1 hour
            ini_set('session.cookie_lifetime', 0); // Until browser closes

            // Session name (dynamic by subdomain)
            session_name($this->getSessionName());

            // Set cookie params for all subdomains
            session_set_cookie_params([
                'domain' => $this->getCookieDomain(),
                'path' => '/',
                'secure' => $secure,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            
            session_start();
        }

        $this->isInitialized = true;
    }

    private function getCookieDomain() {
        $host = $_SERVER['HTTP_HOST'] ?? '';
        if (strpos($host, '.local') !== false) {
            return '.stackovercash.site.local';
        }
        return '.stackovercash.site';
    }

    private function getSessionName() {
        $host = $_SERVER['HTTP_HOST'] ?? '';
        if (strpos($host, 'admin.') === 0) {
            return 'STACKOVERCASH_SESSID_ADMIN';
        } elseif (strpos($host, 'teller.') === 0) {
            return 'STACKOVERCASH_SESSID_TELLER';
        }
        return 'STACKOVERCASH_SESSID';
    }

    public function storeOTP(string $otp, string $phone, string $purpose = 'general'): bool {
        try {
            $this->initSession();

            // Debug logging
            error_log("Storing OTP - Phone: $phone, Purpose: $purpose");
            error_log("Session ID before storing: " . session_id());
            error_log("Session name before storing: " . session_name());
            error_log("Session data before storing: " . print_r($_SESSION, true));

            // Store OTP in session
            $_SESSION['otp'] = [
                'code' => $otp,
                'phone_number' => $phone,
                'created_at' => time(),
                'attempts' => 0,
                'purpose' => $purpose
            ];

            // Debug logging
            error_log("OTP stored successfully");
            error_log("Session data after storing: " . print_r($_SESSION, true));

            return true;
        } catch (Exception $e) {
            error_log("Error storing OTP: " . $e->getMessage());
            return false;
        }
    }

    public function verifyOTP(string $input_otp, string $phone, string $purpose = 'general'): bool {
        try {
            $this->initSession();

            // Debug logging
            error_log("Verifying OTP - Input: $input_otp, Phone: $phone, Purpose: $purpose");
            error_log("Session ID before verify: " . session_id());
            error_log("Session name before verify: " . session_name());
            error_log("Full session data before verify: " . print_r($_SESSION, true));

            // Check if OTP session exists
            if (!isset($_SESSION['otp'])) {
                error_log("No OTP session found");
                return false;
            }

            $sessionOtp = $_SESSION['otp'];
            $attempts = $sessionOtp['attempts'] ?? 0;
            $maxAttempts = 3;

            // Check if too many attempts
            if ($attempts >= $maxAttempts) {
                unset($_SESSION['otp']);
                error_log("Too many attempts");
                return false;
            }

            // Check if OTP has expired (5 minutes)
            $expiryTime = 300; // 5 minutes
            if (time() - $sessionOtp['created_at'] > $expiryTime) {
                unset($_SESSION['otp']);
                error_log("OTP has expired");
                return false;
            }

            // Verify OTP
            if ($input_otp !== $sessionOtp['code']) {
                // Increment attempts
                $_SESSION['otp']['attempts'] = $attempts + 1;
                error_log("Invalid OTP");
                return false;
            }

            // OTP is valid - clear it from session
            unset($_SESSION['otp']);

            // Set verification success in session
            $_SESSION['otp_verified'] = true;

            error_log("OTP verified successfully");
            return true;
        } catch (Exception $e) {
            error_log("Error verifying OTP: " . $e->getMessage());
            return false;
        }
    }

    public function isAuthenticated() {
        $this->initSession();
        return isset($_SESSION['auth']) && isset($_SESSION['auth']['id']);
    }

    public function isSessionExpired() {
        if (!$this->isAuthenticated()) {
            return true;
        }

        $currentTime = time();
        $lastActivity = $_SESSION['auth']['last_activity'] ?? 0;
        $timeDiff = $currentTime - $lastActivity;
        
        // Don't expire new sessions
        $isNewSession = isset($_SESSION['auth']['logged_in_at']) && 
                       ($currentTime - $_SESSION['auth']['logged_in_at'] <= 5);
        
        if ($isNewSession) {
            return false;
        }
        
        // Auto-refresh session if within refresh window
        if ($timeDiff <= $this->sessionRefreshTime) {
            $this->updateActivity();
            return false;
        }
        
        return $timeDiff > $this->sessionTimeout;
    }

    public function updateActivity() {
        if ($this->isAuthenticated()) {
            $_SESSION['auth']['last_activity'] = time();
        }
    }

    public function getTimeUntilExpiry() {
        if (!$this->isAuthenticated()) {
            return 0;
        }
        return $this->sessionTimeout - (time() - $_SESSION['auth']['last_activity']);
    }

    public function createSession($userData, $type = 'user') {
        $this->initSession();

        // Clear any existing session data
            session_unset();
            
            if (isset($_COOKIE[session_name()])) {
                setcookie(
                    session_name(),
                    '',
                    time() - 42000,
                    '/',
                    '',
                false,
                    true
                );
            }
            
        session_regenerate_id(true);

        $_SESSION['auth'] = [
            'id' => $userData['id'],
            'identifier' => $type === 'teller' ? $userData['teller_number'] : $userData['username'],
            'type' => $type,
            'logged_in_at' => time(),
            'last_activity' => time(),
            'first_name' => $userData['first_name'],
            'last_name' => $userData['last_name'],
            'phone_number' => $userData['phone_number'] ?? null, // This line is crucial
            'email' => $userData['email'] ?? null
        ];

        error_log("Session created with data: " . print_r($_SESSION, true));
    }

    public function killSession() {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_unset();
            session_destroy();
            
        if (isset($_COOKIE[session_name()])) {
            setcookie(
                session_name(),
                '',
                time() - 42000,
                    '/',
                    '',
                    false,
                    true
                );
            }
        }
    }

    public function getSessionData() {
        $this->initSession();
        return $_SESSION['auth'] ?? null;
    }

    public function getSessionTimeout() {
        return $this->sessionTimeout;
    }

    public function getSessionRefreshTime() {
        return $this->sessionRefreshTime;
    }

    public function getSessionWarnTime() {
        return $this->sessionWarnTime;
    }

    public function isAuthorizedAdmin() {
        $this->initSession();
        
        // Check if user is authenticated and session is not expired
        if (!$this->isAuthenticated() || $this->isSessionExpired()) {
            return false;
        }
        
        // Check if user type is admin
        $sessionData = $this->getSessionData();
        return $sessionData && isset($sessionData['type']) && $sessionData['type'] === 'admin';
    }
} 
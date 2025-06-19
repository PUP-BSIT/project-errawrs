<?php

class SessionManager {
    private static $instance = null;
    private $sessionTimeout;
    private $sessionRefreshTime;
    private $sessionWarnTime;

    private function __construct() {
        // Session configuration
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_only_cookies', 1);
        ini_set('session.cookie_secure', 0); // Allow non-HTTPS for localhost
        ini_set('session.cookie_samesite', 'Lax'); // Allow same-site cookies
        ini_set('session.gc_maxlifetime', 300); // 5 minutes
        ini_set('session.cookie_lifetime', 0); // Until browser closes

        // Session name
        session_name('STACKOVERCASH_SESSID');

        // Define timeouts
        $this->sessionTimeout = 300;       // 5 minutes
        $this->sessionRefreshTime = 60;    // 1 minute
        $this->sessionWarnTime = 60;       // 1 minute warning

        // Start session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new SessionManager();
        }
        return self::$instance;
    }

    public function storeOTP(string $otp, string $phone, string $purpose = 'general'): bool {
        try {
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
                'attempts' => 0
            ];

            // Ensure session is written
            session_write_close();
            
            // Restart session
            session_start();

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
            $verifiedPhone = $sessionOtp['phone_number'];
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
        return isset($_SESSION['auth']) && isset($_SESSION['auth']['id']);
    }

    public function isSessionExpired() {
        if (!$this->isAuthenticated()) {
            return true;
        }

        $currentTime = time();
        $lastActivity = $_SESSION['auth']['last_activity'] ?? 0;
        $timeDiff = $currentTime - $lastActivity;
        
        $isNewSession = isset($_SESSION['auth']['logged_in_at']) && 
                       ($currentTime - $_SESSION['auth']['logged_in_at'] <= 5);
        
        if ($isNewSession) {
            return false;
        }
        
        return $timeDiff > $this->sessionTimeout;
    }

    public function updateActivity() {
        if ($this->isAuthenticated()) {
            $_SESSION['auth']['last_activity'] = time();
            session_write_close();
            session_start();
        }
    }

    public function getTimeUntilExpiry() {
        if (!$this->isAuthenticated()) {
            return 0;
        }
        return $this->sessionTimeout - (time() - $_SESSION['auth']['last_activity']);
    }

    public function createSession($userData, $type = 'user') {
        if (session_status() === PHP_SESSION_ACTIVE) {
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
            
            session_destroy();
        }

        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        session_start();
        session_regenerate_id(true);

        $_SESSION['auth'] = [
            'id' => $userData['id'],
            'identifier' => $type === 'teller' ? $userData['teller_number'] : $userData['username'],
            'type' => $type,
            'logged_in_at' => time(),
            'last_activity' => time(),
            'first_name' => $userData['first_name'] ?? '',
            'last_name' => $userData['last_name'] ?? '',
            'phone_number' => $userData['phone_number'] ?? null,
            'email' => $userData['email'] ?? null
        ];

        if ($type === 'user' && isset($userData['account'])) {
            $_SESSION['auth']['account'] = $userData['account'];
        }

        session_write_close();
        session_start();
    }

    public function killSession() {
        if ($this->isAuthenticated()) {
            error_log('Killing session for user: ' . ($_SESSION['auth']['identifier'] ?? 'unknown'));
        }

        $_SESSION = array();

        if (isset($_COOKIE[session_name()])) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }

    public function isAuthorizedAdmin() {
        return $this->isAuthenticated() && 
               isset($_SESSION['auth']['type']) && 
               $_SESSION['auth']['type'] === 'admin';
    }

    public function getSessionData() {
        if (!$this->isAuthenticated()) {
            return null;
        }

        return [
            'id' => $_SESSION['auth']['id'],
            'username' => $_SESSION['auth']['identifier'],
            'type' => $_SESSION['auth']['type'],
            'first_name' => $_SESSION['auth']['first_name'] ?? '',
            'last_name' => $_SESSION['auth']['last_name'] ?? '',
            'phone_number' => $_SESSION['auth']['phone_number'] ?? '',
            'last_activity' => $_SESSION['auth']['last_activity'],
            'session_expires_in' => $this->getTimeUntilExpiry()
        ];
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
} 
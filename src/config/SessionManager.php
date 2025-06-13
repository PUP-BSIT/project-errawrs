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

    public function isAuthenticated() {
        return isset($_SESSION['auth']) && isset($_SESSION['auth']['id']);
    }

    public function isSessionExpired() {
        if (!$this->isAuthenticated()) {
            return true;
        }

        // Get the current time
        $currentTime = time();
        
        // Get the last activity time
        $lastActivity = $_SESSION['auth']['last_activity'] ?? 0;
        
        // Calculate time difference
        $timeDiff = $currentTime - $lastActivity;
        
        // Check if this is a new session (within 5 seconds of login)
        $isNewSession = isset($_SESSION['auth']['logged_in_at']) && 
                       ($currentTime - $_SESSION['auth']['logged_in_at'] <= 5);
        
        // Don't expire new sessions
        if ($isNewSession) {
            return false;
        }
        
        return $timeDiff > $this->sessionTimeout;
    }

    public function updateActivity() {
        if ($this->isAuthenticated()) {
            $_SESSION['auth']['last_activity'] = time();
            session_write_close(); // Ensure the session is written
            session_start(); // Reopen the session for further use
        }
    }

    public function getTimeUntilExpiry() {
        if (!$this->isAuthenticated()) {
            return 0;
        }
        return $this->sessionTimeout - (time() - $_SESSION['auth']['last_activity']);
    }

    public function createSession($userData, $type = 'user') {
        // If there's an active session, destroy it properly
        if (session_status() === PHP_SESSION_ACTIVE) {
            // Clear session data
            session_unset();
            
            // Delete the session cookie
            if (isset($_COOKIE[session_name()])) {
                $params = session_get_cookie_params();
                setcookie(
                    session_name(),
                    '',
                    time() - 42000,
                    '/',
                    '',
                    false, // Allow non-HTTPS for localhost
                    true
                );
            }
            
            // Destroy the session
            session_destroy();
        }

        // Set cookie parameters
        $secure = false; // Allow non-HTTPS for localhost
        $httponly = true;
        $samesite = 'Lax'; // Allow same-site cookies
        
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => $httponly,
            'samesite' => $samesite
        ]);

        // Start a new session
        session_start();

        // Generate a new session ID
        session_regenerate_id(true);

        // Set session data
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

        // Add account data for users
        if ($type === 'user' && isset($userData['account'])) {
            $_SESSION['auth']['account'] = $userData['account'];
        }

        // Ensure session data is written
        session_write_close();
        
        // Reopen the session
        session_start();
    }

    public function killSession() {
        if ($this->isAuthenticated()) {
            error_log('Killing session for user: ' . ($_SESSION['auth']['identifier'] ?? 'unknown'));
        }

        // Clear all session variables
        $_SESSION = array();

        // Delete the session cookie
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

        // Destroy the session
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

    // Getters for configuration values
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
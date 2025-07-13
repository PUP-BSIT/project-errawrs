<?php
/**
 * Simple Router Class for ERRAWRS Banking System
 * 
 * This class provides basic routing functionality similar to Laravel.
 * It handles both API and web routes with middleware support.
 */

class Router {
    private $routes = [];
    private $middleware = [];
    private $currentGroup = [];

    // Add these lines:
    private $notFoundHandler;
    private $methodNotAllowedHandler;
    private $forbiddenHandler;
    private $serverErrorHandler;
    
    /**
     * Register a GET route
     */
    public function get($path, $handler) {
        $this->addRoute('GET', $path, $handler);
    }
    
    /**
     * Register a POST route
     */
    public function post($path, $handler) {
        $this->addRoute('POST', $path, $handler);
    }
    
    /**
     * Register a PUT route
     */
    public function put($path, $handler) {
        $this->addRoute('PUT', $path, $handler);
    }
    
    /**
     * Register a DELETE route
     */
    public function delete($path, $handler) {
        $this->addRoute('DELETE', $path, $handler);
    }
    
    /**
     * Group routes with middleware
     */
    public function group($attributes, $callback) {
        $previousGroup = $this->currentGroup;
        $this->currentGroup = array_merge($this->currentGroup, $attributes);
        
        $callback($this);
        
        $this->currentGroup = $previousGroup;
    }
    
    /**
     * Add a route to the collection
     */
    private function addRoute($method, $path, $handler) {
        $route = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'middleware' => $this->currentGroup['middleware'] ?? [],
            'prefix' => $this->currentGroup['prefix'] ?? ''
        ];
        
        $this->routes[] = $route;
    }
    
    /**
     * Handle 404 Not Found
     */
    public function notFound($handler) {
        $this->notFoundHandler = $handler;
    }
    
    /**
     * Handle 405 Method Not Allowed
     */
    public function methodNotAllowed($handler) {
        $this->methodNotAllowedHandler = $handler;
    }
    
    /**
     * Handle 403 Forbidden
     */
    public function forbidden($handler) {
        $this->forbiddenHandler = $handler;
    }
    
    /**
     * Handle 500 Server Error
     */
    public function serverError($handler) {
        $this->serverErrorHandler = $handler;
    }
    
    /**
     * Dispatch the request to the appropriate route
     */
    public function dispatch($method, $uri) {
        try {
            // Remove query string from URI
            $uri = parse_url($uri, PHP_URL_PATH);
            
            // Find matching route
            foreach ($this->routes as $route) {
                $pattern = $this->buildPattern($route['path'], $route['prefix']);
                
                if ($route['method'] === $method && preg_match($pattern, $uri, $matches)) {
                    // Check middleware
                    if (!$this->checkMiddleware($route['middleware'])) {
                        if (isset($this->forbiddenHandler)) {
                            call_user_func($this->forbiddenHandler);
                        } else {
                            http_response_code(403);
                            echo json_encode(['error' => 'Access forbidden']);
                        }
                        return;
                    }
                    
                    // Extract parameters
                    $params = array_slice($matches, 1);
                    
                    // Execute handler
                    if (is_callable($route['handler'])) {
                        call_user_func_array($route['handler'], $params);
                    } else {
                        $this->executeFileHandler($route['handler'], $params);
                    }
                    
                    return;
                }
            }
            
            // No route found
            if (isset($this->notFoundHandler)) {
                call_user_func($this->notFoundHandler);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Route not found']);
            }
            
        } catch (Exception $e) {
            if (isset($this->serverErrorHandler)) {
                call_user_func($this->serverErrorHandler);
            } else {
                http_response_code(500);
                // Show the real error message for debugging
                echo json_encode([
                    'error' => 'Internal server error',
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }
    }
    
    /**
     * Build regex pattern for route matching
     */
    private function buildPattern($path, $prefix = '') {
        $fullPath = $prefix . $path;
        
        // Convert Laravel-style parameters to regex
        $pattern = preg_replace('/\{([^}]+)\}/', '([^/]+)', $fullPath);
        
        return '#^' . $pattern . '$#';
    }
    
    /**
     * Check if middleware allows access
     */
    private function checkMiddleware($middleware) {
        if (empty($middleware)) {
            return true;
        }
        
        foreach ($middleware as $mw) {
            if (!$this->executeMiddleware($mw)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Execute middleware
     */
    private function executeMiddleware($middleware) {
        switch ($middleware) {
            case 'auth':
                return $this->checkAuthentication();
            case 'user':
                return $this->checkUserRole('user');
            case 'teller':
                return $this->checkUserRole('teller');
            case 'admin':
                return $this->checkUserRole('admin');
            case 'otp':
                return $this->checkOtpVerification();
            default:
                return true;
        }
    }
    
    /**
     * Check if user is authenticated
     */
    private function checkAuthentication() {
        require_once __DIR__ . '/../config/SessionManager.php';
        $sessionManager = SessionManager::getInstance();
        return $sessionManager->isAuthenticated();
    }
    
    /**
     * Check user role
     */
    private function checkUserRole($role) {
        if (!$this->checkAuthentication()) {
            return false;
        }
        
        return isset($_SESSION['auth']['type']) && $_SESSION['auth']['type'] === $role;
    }
    
    /**
     * Check OTP verification
     */
    private function checkOtpVerification() {
        return isset($_SESSION['otp_verified']) && $_SESSION['otp_verified'] === true;
    }
    
    /**
     * Execute file-based handler
     */
    private function executeFileHandler($filePath, $params = []) {
        // Use project root as base directory
        $baseDir = realpath(__DIR__ . '/../../');
        $absolutePath = $baseDir . '/' . str_replace(['\\', '//'], '/', ltrim($filePath, '/\\'));
        if (file_exists($absolutePath)) {
            // Set parameters as global variables for the included file
            foreach ($params as $key => $value) {
                $GLOBALS['route_params'][$key] = $value;
            }
            include $absolutePath;
        } else {
            throw new Exception("Handler file not found: $absolutePath");
        }
    }
    
    /**
     * Get all registered routes (for debugging)
     */
    public function getRoutes() {
        return $this->routes;
    }
}

/**
 * Helper function to get route parameters
 */
function route_param($key, $default = null) {
    return $GLOBALS['route_params'][$key] ?? $default;
}

/**
 * Helper function to get all route parameters
 */
function route_params() {
    return $GLOBALS['route_params'] ?? [];
} 
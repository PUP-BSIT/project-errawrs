<?php
require_once __DIR__ . '/../utils/jwt_helper.php';

class AuthMiddleware {
    public static function authenticateTeller() {
        // Get all headers
        $headers = getallheaders();
        
        // Check for Authorization header
        if (!isset($headers['Authorization']) && !isset($headers['authorization'])) {
            http_response_code(401);
            echo json_encode(['error' => 'No authorization token provided']);
            exit();
        }

        // Get the token from the Authorization header
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : $headers['authorization'];
        $token = str_replace('Bearer ', '', $authHeader);

        // Validate token
        $payload = JWTHelper::validateToken($token);
        if (!$payload) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit();
        }

        // Check if teller status is active
        if (!isset($payload['teller']) || $payload['teller']['status'] !== 'active') {
            http_response_code(403);
            echo json_encode(['error' => 'Teller account is not active']);
            exit();
        }

        return $payload['teller'];
    }
} 
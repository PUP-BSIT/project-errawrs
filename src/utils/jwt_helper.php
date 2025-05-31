<?php
require_once __DIR__ . '/../config/db_config.php';

class JWTHelper {
    private static $secret_key = null;
    private static $algorithm = 'HS256';
    private static $token_expiry = 28800; // 8 hours in seconds

    private static function getSecretKey() {
        if (self::$secret_key === null) {
            $envFile = __DIR__ . '/../.env';
            if (!file_exists($envFile)) {
                throw new Exception('.env file not found');
            }
            
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, 'JWT_SECRET=') === 0) {
                    self::$secret_key = substr($line, strlen('JWT_SECRET='));
                    break;
                }
            }
            
            if (self::$secret_key === null) {
                throw new Exception('JWT_SECRET not found in .env file');
            }
        }
        return self::$secret_key;
    }

    public static function generateToken($teller_data) {
        $issuedAt = time();
        $expire = $issuedAt + self::$token_expiry;

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expire,
            'teller' => [
                'id' => $teller_data['teller_number'],
                'first_name' => $teller_data['first_name'],
                'last_name' => $teller_data['last_name'],
                'status' => $teller_data['status']
            ]
        ];

        $header = [
            'typ' => 'JWT',
            'alg' => self::$algorithm
        ];

        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($header)));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));

        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, self::getSecretKey(), true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }

    public static function validateToken($token) {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }

            list($base64Header, $base64Payload, $base64Signature) = $parts;

            $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $base64Signature));
            $expectedSignature = hash_hmac('sha256', $base64Header . "." . $base64Payload, self::getSecretKey(), true);

            if (!hash_equals($signature, $expectedSignature)) {
                return false;
            }

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64Payload)), true);
            
            if (!isset($payload['exp']) || $payload['exp'] < time()) {
                return false;
            }

            return $payload;
        } catch (Exception $e) {
            error_log('Token validation error: ' . $e->getMessage());
            return false;
        }
    }
} 
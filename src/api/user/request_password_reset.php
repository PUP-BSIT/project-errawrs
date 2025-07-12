<?php
use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../../logs/password_reset_error.log');
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../../logs/password_reset_error.log');
header('Content-Type: application/json');

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';

/**
 * Normalize Philippine phone number to +639XXXXXXXXX format
 * Accepts: 09XXXXXXXXX, 639XXXXXXXXX, +639XXXXXXXXX
 */
function normalizePhoneNumber($phone) {
    // Remove all non-digit characters except +
    $phone = preg_replace('/[^\d+]/', '', $phone);
    
    // If it starts with 09, replace with +639
    if (preg_match('/^09(\d{9})$/', $phone, $matches)) {
        return '+639' . $matches[1];
    }
    
    // If it starts with 639, add +
    if (preg_match('/^639(\d{9})$/', $phone, $matches)) {
        return '+639' . $matches[1];
    }
    
    // If it already starts with +639, validate format
    if (preg_match('/^\+639(\d{9})$/', $phone, $matches)) {
        return $phone;
    }
    
    // Invalid format
    return false;
}

/**
 * Normalize Philippine phone number to +639XXXXXXXXX format
 * Accepts: 09XXXXXXXXX, 639XXXXXXXXX, +639XXXXXXXXX
 */
function normalizePhoneNumber($phone) {
    // Remove all non-digit characters except +
    $phone = preg_replace('/[^\d+]/', '', $phone);
    
    // If it starts with 09, replace with +639
    if (preg_match('/^09(\d{9})$/', $phone, $matches)) {
        return '+639' . $matches[1];
    }
    
    // If it starts with 639, add +
    if (preg_match('/^639(\d{9})$/', $phone, $matches)) {
        return '+639' . $matches[1];
    }
    
    // If it already starts with +639, validate format
    if (preg_match('/^\+639(\d{9})$/', $phone, $matches)) {
        return $phone;
    }
    
    // Invalid format
    return false;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $phone_number = $input['phone_number'] ?? null;

    if (empty($phone_number)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'A phone number is required.']);
        exit();
    }

    // Normalize phone number format to +639XXXXXXXXX
    $normalized_phone = normalizePhoneNumber($phone_number);
    error_log("Original phone number: " . $phone_number);
    error_log("Normalized phone number: " . $normalized_phone);

    if (!$normalized_phone) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid phone number format. Please enter a valid Philippine mobile number.']);
        exit();
    }

    // Normalize phone number format to +639XXXXXXXXX
    $normalized_phone = normalizePhoneNumber($phone_number);
    error_log("Original phone number: " . $phone_number);
    error_log("Normalized phone number: " . $normalized_phone);

    if (!$normalized_phone) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid phone number format. Please enter a valid Philippine mobile number.']);
        exit();
    }

    $db = db_connect();

    // Find user by phone number to get their email
    // Search for both +639 and 09 formats
    $stmt = $db->prepare('SELECT user_id, first_name, last_name, email FROM user WHERE phone_number = ? OR phone_number = ?');
    $original_phone = $phone_number; // Keep original input for 09 format search
    $stmt->bind_param('ss', $normalized_phone, $original_phone);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    error_log("User found: " . ($user ? 'Yes' : 'No'));
    if ($user) {
        error_log("User email: " . $user['email']);
    }
    
    error_log("User found: " . ($user ? 'Yes' : 'No'));
    if ($user) {
        error_log("User email: " . $user['email']);
    }
    
    if ($user && !empty($user['email'])) {
        $user_id = $user['user_id'];
        $email = $user['email'];

        // Generate a secure token
        $token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', time() + 3600); // Token expires in 1 hour

        error_log("Generated token for user ID: " . $user_id);

        error_log("Generated token for user ID: " . $user_id);

        $db->begin_transaction();

        try {
            // Invalidate any old tokens for this user
            $deleteStmt = $db->prepare('DELETE FROM password_reset_requests WHERE user_id = ?');
            $deleteStmt->bind_param('i', $user_id);
            $deleteStmt->execute();

            // Insert the new token
            $insertStmt = $db->prepare('INSERT INTO password_reset_requests (user_id, token, expires_at) VALUES (?, ?, ?)');
            $insertStmt->bind_param('iss', $user_id, $token, $expires_at);
            $insertStmt->execute();

            // Construct the reset link based on the request origin
            $host = $_SERVER['HTTP_HOST'];
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
            
            // Check if request is from localhost (development) or production server
            if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
                // Development environment - use localhost
                $reset_link = "{$protocol}://{$host}/project-errawrs/public/user/reset_password.html?token=" . urlencode($token);
            } else {
                // Production environment - use actual domain
                $reset_link = "https://stackovercash.site/user/reset_password.html?token=" . urlencode($token);
            }
            
            error_log("Reset link generated: " . $reset_link);
            error_log("Request host: " . $host . ", Protocol: " . $protocol);

            // Load environment variables
            // Construct the reset link based on the request origin
            $host = $_SERVER['HTTP_HOST'];
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
            
            // Check if request is from localhost (development) or production server
            if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
                // Development environment - use localhost
                $reset_link = "{$protocol}://{$host}/project-errawrs/public/user/reset_password.html?token=" . urlencode($token);
            } else {
                // Production environment - use actual domain
                $reset_link = "https://stackovercash.site/user/reset_password.html?token=" . urlencode($token);
            }
            
            error_log("Reset link generated: " . $reset_link);
            error_log("Request host: " . $host . ", Protocol: " . $protocol);

            // Load environment variables
            $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
            $dotenv->load();

            error_log("SMTP Configuration - Host: " . $_ENV['GMAIL_HOST'] . ", Username: " . $_ENV['GMAIL_USERNAME'] . ", Port: " . $_ENV['GMAIL_PORT']);

            error_log("SMTP Configuration - Host: " . $_ENV['GMAIL_HOST'] . ", Username: " . $_ENV['GMAIL_USERNAME'] . ", Port: " . $_ENV['GMAIL_PORT']);

            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $_ENV['GMAIL_HOST'];
            $mail->SMTPAuth = true;
            $mail->Username = $_ENV['GMAIL_USERNAME'];
            $mail->Password = $_ENV['GMAIL_PASSWORD'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = (int)$_ENV['GMAIL_PORT'];

            $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
            $mail->addAddress($email);

            // Load the email template and CSS
            $templatePath = __DIR__ . '/email-templates/forgot-password-email.html';
            $cssPath = __DIR__ . '/email-templates/forgot-password-email.css';
            
            if (file_exists($templatePath) && file_exists($cssPath)) {
                error_log("Email template and CSS found, loading...");
                $template = file_get_contents($templatePath);
                $css = file_get_contents($cssPath);
                
                if ($template !== false && $css !== false) {
                    // Replace placeholders with actual data
                    $template = str_replace('{{FIRST_NAME}}', $user['first_name'], $template);
                    $template = str_replace('{{LAST_NAME}}', $user['last_name'], $template);
                    $template = str_replace('{{RESET_LINK}}', $reset_link, $template);
                    
                    // Embed CSS inline for email compatibility (same as registration email)
                    $template = str_replace(
                        '<link rel="stylesheet" href="forgot-password-email.css">',
                        '<style>' . $css . '</style>',
                        $template
                    );
                    
                    $emailBody = $template;
                    error_log("Email template loaded and customized successfully with inline CSS");
                } else {
                    error_log("Failed to read email template or CSS file");
                    throw new Exception("Failed to read email template or CSS");
                }
            } else {
                error_log("Email template or CSS file not found");
                throw new Exception("Email template or CSS file not found");
            }
            

            // Load the email template and CSS
            $templatePath = __DIR__ . '/email-templates/forgot-password-email.html';
            $cssPath = __DIR__ . '/email-templates/forgot-password-email.css';
            
            if (file_exists($templatePath) && file_exists($cssPath)) {
                error_log("Email template and CSS found, loading...");
                $template = file_get_contents($templatePath);
                $css = file_get_contents($cssPath);
                
                if ($template !== false && $css !== false) {
                    // Replace placeholders with actual data
                    $template = str_replace('{{FIRST_NAME}}', $user['first_name'], $template);
                    $template = str_replace('{{LAST_NAME}}', $user['last_name'], $template);
                    $template = str_replace('{{RESET_LINK}}', $reset_link, $template);
                    
                    // Embed CSS inline for email compatibility (same as registration email)
                    $template = str_replace(
                        '<link rel="stylesheet" href="forgot-password-email.css">',
                        '<style>' . $css . '</style>',
                        $template
                    );
                    
                    $emailBody = $template;
                    error_log("Email template loaded and customized successfully with inline CSS");
                } else {
                    error_log("Failed to read email template or CSS file");
                    throw new Exception("Failed to read email template or CSS");
                }
            } else {
                error_log("Email template or CSS file not found");
                throw new Exception("Email template or CSS file not found");
            }
            
            $mail->isHTML(true);
            $mail->Subject = 'StackOvercash Password Reset Request';
            $mail->Body = $emailBody;
            $mail->Body = $emailBody;
            $mail->AltBody = "Hello {$user['first_name']},\n\nWe received a request to reset your password. Copy and paste this URL into your browser to set a new one:\n\n{$reset_link}\n\nThis link will expire in one hour. If you did not request a password reset, you can safely ignore this email.\n\nThank you,\nThe StackOvercash Team";

            error_log("Attempting to send email to: " . $email);
            error_log("Attempting to send email to: " . $email);
            $mail->send();
            error_log("Email sent successfully");
            error_log("Email sent successfully");
            
            $db->commit();
            error_log("Database transaction committed successfully");
            error_log("Database transaction committed successfully");
        } catch (Exception $e) {
            $db->rollback();
            error_log("Error in password reset process: " . $e->getMessage());
            error_log("Error in password reset process: " . $e->getMessage());
            throw $e; // Re-throw to be caught by the outer catch block
        }
    } else {
        error_log("No user found with phone number: " . $normalized_phone . " or user has no email");
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'No account found with this phone number. Please check your phone number or contact support if you believe this is an error.']);
        exit();
    } else {
        error_log("No user found with phone number: " . $normalized_phone . " or user has no email");
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'No account found with this phone number. Please check your phone number or contact support if you believe this is an error.']);
        exit();
    }

    // Return success message only if email was sent
    echo json_encode(['success' => true, 'message' => 'Password reset link has been sent to your registered email address.']);
    // Return success message only if email was sent
    echo json_encode(['success' => true, 'message' => 'Password reset link has been sent to your registered email address.']);

} catch (Exception $e) {
    error_log("Request Password Reset Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred. Please try again later.']);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($deleteStmt)) $deleteStmt->close();
    if (isset($insertStmt)) $insertStmt->close();
    if (isset($db) && $db->ping()) $db->close();
} 
<?php
use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';

function normalizePhoneNumber($phone) {
    $phone = preg_replace('/[^\d+]/', '', $phone);
    
    if (preg_match('/^09(\d{9})$/', $phone, $matches)) {
        return '+639' . $matches[1];
    }
    
    if (preg_match('/^639(\d{9})$/', $phone, $matches)) {
        return '+639' . $matches[1];
    }
    
    if (preg_match('/^\+639(\d{9})$/', $phone, $matches)) {
        return $phone;
    }
    
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
        echo json_encode(['success' => false, 'error' => 'Phone number is required.']);
        exit();
    }

    $normalized_phone = normalizePhoneNumber($phone_number);

    if (!$normalized_phone) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid phone number format. Please enter a valid Philippine mobile number.']);
        exit();
    }

    $db = db_connect();

    $stmt = $db->prepare('SELECT username, email, first_name, last_name FROM user WHERE phone_number = ?');
    $stmt->bind_param('s', $normalized_phone);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    $stmt->close();
    $db->close();

    if ($user && !empty($user['email'])) {
        $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
        $dotenv->load();

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $_ENV['GMAIL_HOST'];
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['GMAIL_USERNAME'];
        $mail->Password = $_ENV['GMAIL_PASSWORD'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = (int)$_ENV['GMAIL_PORT'];

        $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
        $mail->addAddress($user['email']);

        // Load the email template and CSS
        $templatePath = __DIR__ . '/email-templates/forgot-username-email.html';
        $cssPath = __DIR__ . '/email-templates/forgot-username-email.css';
        
        if (file_exists($templatePath) && file_exists($cssPath)) {
            $template = file_get_contents($templatePath);
            $css = file_get_contents($cssPath);
            
            if ($template !== false && $css !== false) {
                // Replace placeholders with actual data
                $template = str_replace('{{FIRST_NAME}}', $user['first_name'], $template);
                $template = str_replace('{{LAST_NAME}}', $user['last_name'], $template);
                $template = str_replace('{{USERNAME}}', $user['username'], $template);
                
                // Embed CSS inline for email compatibility
                $template = str_replace(
                    '<link rel="stylesheet" href="forgot-username-email.css">',
                    '<style>' . $css . '</style>',
                    $template
                );
                
                $emailBody = $template;
            } else {
                throw new Exception("Failed to read email template or CSS");
            }
        } else {
            throw new Exception("Email template or CSS file not found");
        }

        $mail->isHTML(true);
        $mail->Subject = 'Your StackOvercash Username';
        $mail->Body = $emailBody;
        $mail->AltBody = "Hello {$user['first_name']},\n\nAs requested, your username for StackOvercash is: {$user['username']}\n\nIf you did not request this, you can safely ignore this email.\n\nThank you,\nThe StackOvercash Team";

        $mail->send();
        
        // Return success message when email is sent
        echo json_encode(['success' => true, 'message' => 'Username has been sent to your registered email address.']);
    } else {
        // Return error message when no user is found
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'No account found with this phone number. Please check your phone number or contact support if you believe this is an error.']);
    }

} catch (Exception $e) {
    error_log("Forgot Username Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred. Please try again later.']);
} 
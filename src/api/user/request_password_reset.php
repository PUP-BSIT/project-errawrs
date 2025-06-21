<?php
use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';

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

    $db = db_connect();

    // Find user by phone number to get their email
    $stmt = $db->prepare('SELECT user_id, first_name, email FROM user WHERE phone_number = ?');
    $stmt->bind_param('s', $phone_number);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if ($user && !empty($user['email'])) {
        $user_id = $user['user_id'];
        $email = $user['email'];

        // Generate a secure token
        $token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', time() + 3600); // Token expires in 1 hour

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

            // Construct the reset link
            $reset_link = "http://{$_SERVER['HTTP_HOST']}/project-errawrs/public/user/reset_password.html?token=" . urlencode($token);

            // Send the email
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
            $mail->addAddress($email);

            $mail->isHTML(true);
            $mail->Subject = 'StackOvercash Password Reset Request';
            $mail->Body    = "Hello {$user['first_name']},<br><br>We received a request to reset your password. Click the link below to set a new one:<br><br><a href='{$reset_link}'>{$reset_link}</a><br><br>This link will expire in one hour. If you did not request a password reset, you can safely ignore this email.<br><br>Thank you,<br>The StackOvercash Team";
            $mail->AltBody = "Hello {$user['first_name']},\n\nWe received a request to reset your password. Copy and paste this URL into your browser to set a new one:\n\n{$reset_link}\n\nThis link will expire in one hour. If you did not request a password reset, you can safely ignore this email.\n\nThank you,\nThe StackOvercash Team";

            $mail->send();
            
            $db->commit();
        } catch (Exception $e) {
            $db->rollback();
            throw $e; // Re-throw to be caught by the outer catch block
        }
    }

    // Always return a generic success message
    echo json_encode(['success' => true, 'message' => 'If an account with that phone number exists, a password reset link has been sent to the registered email.']);

} catch (Exception $e) {
    error_log("Request Password Reset Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred. Please try again later.']);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($deleteStmt)) $deleteStmt->close();
    if (isset($insertStmt)) $insertStmt->close();
    if (isset($db) && $db->ping()) $db->close();
} 
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
        echo json_encode(['success' => false, 'error' => 'Phone number is required.']);
        exit();
    }

    $db = db_connect();

    $stmt = $db->prepare('SELECT username, email, first_name FROM user WHERE phone_number = ?');
    $stmt->bind_param('s', $phone_number);
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

        $mail->isHTML(true);
        $mail->Subject = 'Your StackOvercash Username';
        $mail->Body    = "Hello {$user['first_name']},<br><br>As requested, your username for StackOvercash is: <b>{$user['username']}</b><br><br>If you did not request this, you can safely ignore this email.<br><br>Thank you,<br>The StackOvercash Team";
        $mail->AltBody = "Hello {$user['first_name']},\n\nAs requested, your username for StackOvercash is: {$user['username']}\n\nIf you did not request this, you can safely ignore this email.\n\nThank you,\nThe StackOvercash Team";

        $mail->send();
    }

    // Always return a generic success message to prevent user enumeration
    echo json_encode(['success' => true, 'message' => 'If an account with that phone number exists, an email has been sent with the username.']);

} catch (Exception $e) {
    error_log("Forgot Username Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred. Please try again later.']);
} 
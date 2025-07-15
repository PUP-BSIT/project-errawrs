<?php
require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Dotenv\Dotenv;

$session = SessionManager::getInstance();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

if (!$session->isAuthorizedAdmin()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

// Get teller_id from URL parameter
$teller_id = intval(route_param(0)); // First parameter from URL path

if (!$teller_id || $teller_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing teller_id']);
    exit();
}

// Helper to get base URL
function getBaseUrl() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
        return 'http://localhost/project-errawrs/public';
    }
    return 'https://dev.stackovercash.site';
}

try {
    // Load environment variables if .env file exists
    $envFile = __DIR__ . '/../../../.env';
    if (file_exists($envFile)) {
        $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
        $dotenv->load();
    } else {
        error_log("Warning: .env file not found, using default values");
    }
    
    error_log("Teller reset password - Teller ID: " . $teller_id);
    
    $db = db_connect();
    $stmt = $db->prepare('SELECT email, first_name, last_name FROM teller WHERE teller_id = ?');
    $stmt->bind_param('i', $teller_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $teller = $result->fetch_assoc();
    
    if (!$teller) {
        throw new Exception('Teller not found');
    }
    
    $email = $teller['email'];
    $first_name = $teller['first_name'];
    $last_name = $teller['last_name'];
    
    // Generate reset link
    $reset_link = getBaseUrl() . '/teller/reset_password.html?teller_email=' . urlencode($email);
    
    // Include and use the PHP email template
    require_once __DIR__ . '/email-templates/teller-reset-password-email.php';
    $htmlBody = getTellerResetPasswordEmailTemplate($first_name, $last_name, $email, $reset_link);
    
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $_ENV['GMAIL_HOST'] ?? 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['GMAIL_USERNAME'] ?? '';
    $mail->Password = $_ENV['GMAIL_PASSWORD'] ?? '';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $_ENV['GMAIL_PORT'] ?? 587;
    $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'] ?? 'noreply@stackovercash.site', $_ENV['GMAIL_FROM_NAME'] ?? 'StackOvercash');
    $mail->addAddress($email, "$first_name $last_name");
    $mail->Subject = 'Reset Your Teller Account Password';
    $mail->isHTML(true);
    $mail->Body = $htmlBody;
    $mail->AltBody = "Dear $first_name $last_name,\n\nYou requested a password reset for your teller account. Please use the following link: $reset_link\n\nIf you did not request this reset, please ignore this email.\n\nBest regards,\nStackOvercash Team";
    
    // Check if email credentials are configured
    if (empty($_ENV['GMAIL_USERNAME']) || empty($_ENV['GMAIL_PASSWORD'])) {
        error_log("Email credentials not configured, returning success for testing");
        echo json_encode(['success' => true, 'message' => 'Password reset request processed. Email configuration required for actual sending.']);
        exit();
    }
    
    error_log("Attempting to send reset email to: " . $email);
    $mail->send();
    error_log("Reset email sent successfully to: " . $email);
    
    echo json_encode(['success' => true, 'message' => 'A password reset link has been sent to the teller\'s email address.']);
    
} catch (Exception $e) {
    error_log("Teller reset password error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} 
<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Dotenv\Dotenv;

header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? '';

if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email is required']);
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
    }
    
    $db = db_connect();
    
    // Check if teller exists and is active
    $stmt = $db->prepare('SELECT teller_id, first_name, last_name, status FROM teller WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Teller not found with this email']);
        exit();
    }
    
    $teller = $result->fetch_assoc();
    
    // Only allow reset for active accounts
    if ($teller['status'] !== 'active') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Account is not active. Please contact your administrator.']);
        exit();
    }
    
    // Generate reset token
    $token = bin2hex(random_bytes(32));
    $expires_at = date('Y-m-d H:i:s', time() + 3600); // Token expires in 1 hour
    
    // Store reset token in database
    $db->begin_transaction();
    
    // Delete any existing tokens for this teller
    $deleteStmt = $db->prepare('DELETE FROM password_reset_requests WHERE user_id = ? AND user_type = "teller"');
    $deleteStmt->bind_param('i', $teller['teller_id']);
    $deleteStmt->execute();
    
    // Insert new token
    $insertStmt = $db->prepare('INSERT INTO password_reset_requests (user_id, user_type, token, expires_at) VALUES (?, "teller", ?, ?)');
    $insertStmt->bind_param('iss', $teller['teller_id'], $token, $expires_at);
    $insertStmt->execute();
    
    // Generate reset link
    $reset_link = getBaseUrl() . '/teller/reset_password.html?token=' . urlencode($token);
    
    // Send email using PHP template
    require_once __DIR__ . '/../admin/email-templates/teller-reset-password-email.php';
    $htmlBody = getTellerResetPasswordEmailTemplate($teller['first_name'], $teller['last_name'], $email, $reset_link);
    
    // Check if email credentials are configured
    if (empty($_ENV['GMAIL_USERNAME']) || empty($_ENV['GMAIL_PASSWORD'])) {
        error_log("Email credentials not configured, returning success for testing");
        $db->rollback();
        echo json_encode(['success' => true, 'message' => 'Password reset request processed. Email configuration required for actual sending.']);
        exit();
    }
    
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $_ENV['GMAIL_HOST'] ?? 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['GMAIL_USERNAME'] ?? '';
    $mail->Password = $_ENV['GMAIL_PASSWORD'] ?? '';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $_ENV['GMAIL_PORT'] ?? 587;
    $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'] ?? 'noreply@stackovercash.site', $_ENV['GMAIL_FROM_NAME'] ?? 'StackOvercash');
    $mail->addAddress($email, $teller['first_name'] . ' ' . $teller['last_name']);
    $mail->Subject = 'Reset Your Teller Account Password';
    $mail->isHTML(true);
    $mail->Body = $htmlBody;
    $mail->AltBody = "Dear {$teller['first_name']} {$teller['last_name']},\n\nYou requested a password reset for your teller account. Please use the following link: $reset_link\n\nIf you did not request this reset, please ignore this email.\n\nBest regards,\nStackOvercash Team";
    
    error_log("Attempting to send reset email to: " . $email);
    $mail->send();
    error_log("Reset email sent successfully to: " . $email);
    
    $db->commit();
    echo json_encode(['success' => true, 'message' => 'Password reset link has been sent to your email address.']);
    
} catch (Exception $e) {
    if (isset($db)) $db->rollback();
    error_log('Teller Reset Password Error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($deleteStmt)) $deleteStmt->close();
    if (isset($insertStmt)) $insertStmt->close();
    if (isset($db)) db_close($db);
} 
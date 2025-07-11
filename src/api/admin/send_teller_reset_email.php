<?php
require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

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

$input = json_decode(file_get_contents('php://input'), true);
$teller_id = $input['teller_id'] ?? null;
if (!$teller_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing teller_id']);
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
    // Prepare HTML email
    $templatePath = __DIR__ . '/../user/email-templates/teller-reset-password-email.html';
    $template = file_get_contents($templatePath);
    $cssPath = __DIR__ . '/../user/email-templates/registration-email.css';
    $css = file_get_contents($cssPath);
    $htmlBody = str_replace([
      '{{FIRST_NAME}}',
      '{{LAST_NAME}}',
      '{{EMAIL}}',
      '{{RESET_PASSWORD_LINK}}',
      '<link rel="stylesheet" href="registration-email.css">'
    ], [
      htmlspecialchars($first_name),
      htmlspecialchars($last_name),
      htmlspecialchars($email),
      $reset_link,
      '<style>' . $css . '</style>'
    ], $template);
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $_ENV['GMAIL_HOST'];
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['GMAIL_USERNAME'];
    $mail->Password = $_ENV['GMAIL_PASSWORD'];
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $_ENV['GMAIL_PORT'];
    $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
    $mail->addAddress($email, "$first_name $last_name");
    $mail->Subject = 'Reset Your Teller Account Password';
    $mail->isHTML(true);
    $mail->Body = $htmlBody;
    $mail->AltBody = "Dear $first_name $last_name,\n\nYou requested a password reset for your teller account. Please use the following link: $reset_link\n\nIf you did not request this reset, please ignore this email.\n\nBest regards,\nStackOvercash Team";
    $mail->send();
    echo json_encode(['success' => true, 'message' => 'A password reset link has been sent to the teller\'s email address.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} 
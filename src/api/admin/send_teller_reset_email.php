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
    $reset_link = 'http://localhost/project-errawrs/public/teller/reset_password.html?teller_email=' . urlencode($email);
    // Send email
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
    $dotenv->load();
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
    $mail->Body = "Dear $first_name $last_name,\n\nYou requested a password reset for your teller account. Please click the link below to reset your password:\n\n$reset_link\n\nIf you did not request this reset, please ignore this email.\n\nBest regards,\nStackOvercash Team";
    $mail->send();
    echo json_encode(['success' => true, 'message' => 'A password reset link has been sent to the teller\'s email address.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} 
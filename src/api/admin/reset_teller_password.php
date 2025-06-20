<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    exit();
}

// Set the project root path
if (!defined('PROJECT_ROOT')) {
    define('PROJECT_ROOT', realpath(__DIR__ . '/../../..'));
}

// Load environment variables and dependencies
require_once PROJECT_ROOT . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(PROJECT_ROOT);
$dotenv->load();

// Enable error reporting and logging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', PROJECT_ROOT . '/logs/error.log');

// Include SessionManager
require_once PROJECT_ROOT . '/src/config/SessionManager.php';
$sessionManager = SessionManager::getInstance();

// Set JSON header first before any output
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");
header("Access-Control-Allow-Credentials: true");

// Function to handle errors
function sendError($message, $code = 400) {
    error_log("Reset Teller Password Error: " . $message);
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

// Verify admin is logged in using SessionManager
if (!$sessionManager->isAuthorizedAdmin()) {
    sendError('Unauthorized access', 401);
}

// Update activity to prolong session
$sessionManager->updateActivity();

try {
    require_once PROJECT_ROOT . '/src/config/database.php';
} catch (Exception $e) {
    sendError('Configuration error: ' . $e->getMessage(), 500);
}

// Get and validate input data
$input = file_get_contents("php://input");
if (!$input) {
    sendError('No input data received');
}
$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendError('Invalid JSON: ' . json_last_error_msg() . '. Raw input: ' . $input);
}
if (!isset($data['teller_id'])) {
    sendError('Missing teller_id');
}
$teller_id = intval($data['teller_id']);
if ($teller_id <= 0) {
    sendError('Invalid teller_id');
}

try {
    $db = db_connect();
    $db->begin_transaction();

    // Fetch teller info
    $stmt = $db->prepare("SELECT teller_id, first_name, last_name, email FROM teller WHERE teller_id = ?");
    if (!$stmt) throw new Exception("Database prepare failed: " . $db->error);
    $stmt->bind_param("i", $teller_id);
    if (!$stmt->execute()) throw new Exception("Database execute failed: " . $stmt->error);
    $result = $stmt->get_result();
    if ($result->num_rows === 0) sendError('Teller not found', 404);
    $teller = $result->fetch_assoc();

    // Generate a temporary password hash (will be updated when teller sets their password)
    $temp_password = bin2hex(random_bytes(8)); // Generate a random 16-character string
    $password_hash = password_hash($temp_password, PASSWORD_DEFAULT);

    // Update teller password and set status to pending
    $update = $db->prepare("UPDATE teller SET password_hash = ?, status = 'pending' WHERE teller_id = ?");
    if (!$update) throw new Exception("Database prepare failed: " . $db->error);
    $update->bind_param("si", $password_hash, $teller_id);
    if (!$update->execute()) throw new Exception("Database execute failed: " . $update->error);

    // Send reset email
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $_ENV['GMAIL_HOST'];
    $mail->SMTPAuth = true;
    $mail->Username = $_ENV['GMAIL_USERNAME'];
    $mail->Password = $_ENV['GMAIL_PASSWORD'];
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $_ENV['GMAIL_PORT'];
    $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
    $mail->addAddress($teller['email'], "{$teller['first_name']} {$teller['last_name']}");
    $mail->Subject = 'Reset Your Teller Account Password';
    $mail->Body = "Dear {$teller['first_name']} {$teller['last_name']},\n\n"
        . "A password reset has been requested for your teller account at StackOvercash. Here are your temporary credentials:\n\n"
        . "Teller Number: {$teller['teller_id']}\n"
        . "Temporary Password: {$temp_password}\n\n"
        . "Please click the link below to set your new password and complete the reset process:\n"
        . "http://localhost/project-errawrs/public/teller/set_password.html?teller_email=" . urlencode($teller['email']) . "\n\n"
        . "For security reasons, please change your password immediately after logging in.\n\n"
        . "If you did not request this reset, please contact your administrator.\n\n"
        . "Best regards,\nStackOvercash Team";
    $mail->send();

    $db->commit();
    echo json_encode([
        'success' => true,
        'message' => 'Password reset email sent to teller.'
    ]);
} catch (mysqli_sql_exception $e) {
    if (isset($db)) $db->rollback();
    error_log("Database Error: " . $e->getMessage());
    sendError('Database error: ' . $e->getMessage(), 500);
} catch (PHPMailer\PHPMailer\Exception $e) {
    if (isset($db)) $db->rollback();
    error_log("Email Error: " . $e->getMessage());
    sendError('Email sending failed: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    if (isset($db)) $db->rollback();
    error_log("General Error: " . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($update)) $update->close();
    if (isset($db)) db_close($db);
} 
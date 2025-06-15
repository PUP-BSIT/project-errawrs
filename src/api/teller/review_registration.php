<?php
ini_set('display_errors', 1); // Remove in production!
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/SessionManager.php';
$session = SessionManager::getInstance();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}
if (!$session->isAuthenticated() || $_SESSION['auth']['type'] !== 'teller') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}
$session->updateActivity();

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['registration_id']) || !isset($input['action']) || !in_array($input['action'], ['approve', 'deny'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
    exit();
}

$registration_id = $input['registration_id'];
$action = $input['action'];

try {
    $db = db_connect();
    $db->begin_transaction();

    $stmt = $db->prepare('SELECT * FROM registration_request WHERE registration_id = ?');
    $stmt->bind_param('i', $registration_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $registration = $result->fetch_assoc();

    if (!$registration) {
        throw new Exception('Registration request not found');
    }

    if ($action === 'approve') {
        // Generate a unique username
        $base_username = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $registration['first_name'] . $registration['last_name']));
        $username = $base_username;
        $i = 1;
        $checkUser = $db->prepare('SELECT COUNT(*) as cnt FROM user WHERE username = ?');
        while (true) {
            $checkUser->bind_param('s', $username);
            $checkUser->execute();
            $res = $checkUser->get_result()->fetch_assoc();
            if ($res['cnt'] == 0) break;
            $username = $base_username . $i;
            $i++;
        }
        $checkUser->close();

        $password = bin2hex(random_bytes(8));
        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        // Insert into user table
        $insertUser = $db->prepare('
            INSERT INTO user (
                username, password_hash, first_name, last_name, phone_number, date_of_birth, nationality, street, city, zip_code, country, email, id_type, id_image
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $insertUser->bind_param(
            'ssssssssssssss',
            $username,
            $password_hash,
            $registration['first_name'],
            $registration['last_name'],
            $registration['phone_number'],
            $registration['date_of_birth'],
            $registration['nationality'],
            $registration['street'],
            $registration['city'],
            $registration['zip_code'],
            $registration['country'],
            $registration['email'],
            $registration['id_type'],
            $registration['id_image']
        );
        $insertUser->execute();
        $user_id = $db->insert_id;

        // Generate account number
        $seqResult = $db->query('SELECT MAX(CAST(SUBSTRING(account_number, 9) AS UNSIGNED)) as last_seq FROM account');
        $seqRow = $seqResult->fetch_assoc();
        $nextSeq = ($seqRow['last_seq'] ?? 0) + 1;
        $year = date('y');
        $accountNumber = sprintf('544%s0%06d', $year, $nextSeq);

        // Insert into account table
        $insertAccount = $db->prepare('
            INSERT INTO account (user_id, account_number, balance, status, account_type, created_at)
            VALUES (?, ?, 0.00, "active", "savings", NOW())
        ');
        $insertAccount->bind_param('is', $user_id, $accountNumber);
        $insertAccount->execute();

        // Delete the registration request
        $deleteReg = $db->prepare('DELETE FROM registration_request WHERE registration_id = ?');
        $deleteReg->bind_param('i', $registration_id);
        $deleteReg->execute();

        // Send email
        $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
        $dotenv->load();

        $mail = new PHPMailer(true);
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ];
        $mail->isSMTP();
        $mail->Host = $_ENV['GMAIL_HOST'];
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['GMAIL_USERNAME'];
        $mail->Password = $_ENV['GMAIL_PASSWORD'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = (int)$_ENV['GMAIL_PORT'];

        $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
        $mail->addAddress($registration['email']);
        $mail->Subject = 'Registration Approved - Your Account Details';
        $mail->Body = "Hello {$registration['first_name']},\n\n"
            . "Your registration has been approved! Here are your account details:\n\n"
            . "Username: $username\n"
            . "Password: $password\n"
            . "Account Number: $accountNumber\n\n"
            . "Please change your password after your first login.\n\n"
            . "Thank you for choosing our bank!";

        $mail->send();

        $message = "Registration approved. Account created with ID: $user_id and account number: $accountNumber";
    } else {
        // Deny: just delete the registration request
        $deleteReg = $db->prepare('DELETE FROM registration_request WHERE registration_id = ?');
        $deleteReg->bind_param('i', $registration_id);
        $deleteReg->execute();

        // Send email
        $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
        $dotenv->load();

        $mail = new PHPMailer(true);
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ];
        $mail->isSMTP();
        $mail->Host = $_ENV['GMAIL_HOST'];
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['GMAIL_USERNAME'];
        $mail->Password = $_ENV['GMAIL_PASSWORD'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = (int)$_ENV['GMAIL_PORT'];

        $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
        $mail->addAddress($registration['email']);
        $mail->Subject = 'Registration Denied';
        $mail->Body = "Hello {$registration['first_name']},\n\n"
            . "We regret to inform you that your registration has been denied.\n"
            . "Please contact our support team for more information.\n\n"
            . "Thank you for your interest in our bank.";

        $mail->send();

        $message = "Registration denied and deleted.";
    }

    $db->commit();
    echo json_encode(['success' => true, 'message' => $message]);
} catch (Exception $e) {
    if (isset($db)) $db->rollback();
    error_log("Review Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($insertUser)) $insertUser->close();
    if (isset($insertAccount)) $insertAccount->close();
    if (isset($deleteReg)) $deleteReg->close();
    if (isset($db)) $db->close();
}
?>

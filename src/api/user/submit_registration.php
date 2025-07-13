<?php
require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$sessionManager = SessionManager::getInstance();
$sessionManager->initSession();
header('Content-Type: application/json');

define('DEBUG', true);
define('ALLOWED_FILE_EXTENSIONS', ['jpg', 'jpeg', 'png', 'pdf']);
define('PHONE_REGEX', '/^\+639\d{9}$/');

if (DEBUG) {
    error_log("Submit Registration - Session data: " . print_r($_SESSION, true));
    error_log("Submit Registration - OTP verified flag: " . 
        (isset($_SESSION['otp_verified']) ? $_SESSION['otp_verified'] : 'NOT SET'));
}

function validateHttpMethod() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit();
    }
}

function validateOtpVerification() {
    if (!isset($_SESSION['otp_verified']) || !$_SESSION['otp_verified']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Phone number not verified']);
        exit();
    }
}

function validateFileUpload() {
    if (!isset($_FILES['id_image']) || $_FILES['id_image']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID image is required']);
        exit();
    }
}

function validateRequiredFields($input) {
    $requiredFields = [
        'first_name', 'last_name', 'phone_number', 'date_of_birth',
        'nationality', 'street', 'city', 'zip_code', 'country',
        'email', 'id_type'
    ];
    
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'error' => "Missing required field: $field"
            ]);
            exit();
        }
    }
}

function validatePhoneNumber($phoneNumber) {
    if (!preg_match(PHONE_REGEX, $phoneNumber)) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Invalid phone number format. Must start with +639 and be 13 characters.'
        ]);
        exit();
    }
}

function checkExistingRegistration($db, $phoneNumber) {
    $checkPhoneQuery = $db->prepare(
        'SELECT registration_id FROM registration_request WHERE phone_number = ? AND status = "pending"'
    );
    $checkPhoneQuery->bind_param('s', $phoneNumber);
    $checkPhoneQuery->execute();
    $phoneResult = $checkPhoneQuery->get_result();
    
    if ($phoneResult->num_rows > 0) {
        throw new Exception(
            'A registration with this phone number is already pending. ' .
            'Please wait for approval or contact support.'
        );
    }
}

function checkExistingUser($db, $phoneNumber) {
    $checkUserQuery = $db->prepare('SELECT user_id FROM user WHERE phone_number = ?');
    $checkUserQuery->bind_param('s', $phoneNumber);
    $checkUserQuery->execute();
    $userResult = $checkUserQuery->get_result();
    
    if ($userResult->num_rows > 0) {
        throw new Exception(
            'This phone number is already registered. ' .
            'Please use a different phone number or contact support.'
        );
    }
}

function insertRegistrationRequest($db, $input) {
    $insertQuery = $db->prepare(
        'INSERT INTO registration_request (
            first_name, last_name, phone_number, date_of_birth, nationality, 
            street, city, zip_code, country, email, id_type, id_image, 
            status, request_type
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", "new_registration"
        )'
    );
    
    $idImagePath = '';
    
    $insertQuery->bind_param(
        'ssssssssssss',
        $input['first_name'], $input['last_name'], $input['phone_number'], 
        $input['date_of_birth'], $input['nationality'], $input['street'], 
        $input['city'], $input['zip_code'], $input['country'], $input['email'], 
        $input['id_type'], $idImagePath
    );
    $insertQuery->execute();
    
    return $db->insert_id;
}

function createUploadDirectory($registrationId) {
    $uploadDir = __DIR__ . '/uploads/registration/' . $registrationId;
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    return $uploadDir;
}

function processFileUpload($uploadDir, $registrationId, $idType) {
    $fileExtension = strtolower(
        pathinfo($_FILES['id_image']['name'], PATHINFO_EXTENSION)
    );
    
    if (!in_array($fileExtension, ALLOWED_FILE_EXTENSIONS)) {
        throw new Exception(
            'Invalid file type. Allowed types: ' . 
            implode(', ', ALLOWED_FILE_EXTENSIONS)
        );
    }

    $filename = $registrationId . '_' . $idType . '.' . $fileExtension;
    $filePath = $uploadDir . '/' . $filename;
    
    if (!move_uploaded_file($_FILES['id_image']['tmp_name'], $filePath)) {
        throw new Exception('Failed to upload file');
    }

    return 'uploads/registration/' . $registrationId . '/' . $filename;
}

function updateRegistrationFilePath($db, $registrationId, $filePath) {
    $updateQuery = $db->prepare(
        'UPDATE registration_request SET id_image = ? WHERE registration_id = ?'
    );
    $updateQuery->bind_param('si', $filePath, $registrationId);
    $updateQuery->execute();
}

function configurePHPMailer() {
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

    return $mail;
}

function prepareEmailTemplate($firstName, $lastName, $registrationId) {
    $emailTemplate = file_get_contents(
        __DIR__ . '/email-templates/registration-email.html'
    );
    $emailCSS = file_get_contents(
        __DIR__ . '/email-templates/registration-email.css'
    );
    
    $emailTemplate = str_replace('{{FIRST_NAME}}', $firstName, $emailTemplate);
    $emailTemplate = str_replace('{{LAST_NAME}}', $lastName, $emailTemplate);
    $emailTemplate = str_replace('{{REGISTRATION_ID}}', $registrationId, $emailTemplate);
    
    $emailTemplate = str_replace(
        '<link rel="stylesheet" href="registration-email.css">',
        '<style>' . $emailCSS . '</style>',
        $emailTemplate
    );

    return $emailTemplate;
}

function sendConfirmationEmail($email, $firstName, $lastName, $registrationId) {
    $mail = configurePHPMailer();
    $emailTemplate = prepareEmailTemplate($firstName, $lastName, $registrationId);

    $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
    $mail->addAddress($email);
    $mail->Subject = 'Registration Submitted Successfully';
    $mail->isHTML(true);
    $mail->Body = $emailTemplate;

    $mail->send();
}

validateHttpMethod();
validateOtpVerification();
validateFileUpload();

// Handle both JSON and multipart form data
if (isset($_POST['data'])) {
    // JSON data format
    $input = json_decode($_POST['data'], true);
} else {
    // Multipart form data format
    $input = $_POST;
}
validateRequiredFields($input);
validatePhoneNumber($input['phone_number']);

try {
    $db = db_connect();
    $db->begin_transaction();

    checkExistingRegistration($db, $input['phone_number']);
    checkExistingUser($db, $input['phone_number']);

    $registrationId = insertRegistrationRequest($db, $input);

    $uploadDir = createUploadDirectory($registrationId);
    $filePath = processFileUpload($uploadDir, $registrationId, $input['id_type']);
    
    updateRegistrationFilePath($db, $registrationId, $filePath);

    sendConfirmationEmail(
        $input['email'], 
        $input['first_name'], 
        $input['last_name'], 
        $registrationId
    );

    $db->commit();
    unset($_SESSION['otp_verified']);

    echo json_encode([
        'success' => true,
        'message' => 'Registration submitted. Check your email for review status.',
        'registration_id' => $registrationId
    ]);

} catch (Exception $e) {
    if (isset($db)) $db->rollback();
    error_log("Registration Request Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if (isset($db)) $db->close();
}
?>
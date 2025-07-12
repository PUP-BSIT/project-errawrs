<?php

require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Initialize session and set headers
$session = SessionManager::getInstance();
$session->initSession();

header('Content-Type: application/json');

// Debug session info
error_log("Session ID in create_additional_account: " . session_id());
error_log("Full SESSION data: " . print_r($_SESSION, true));

// AUTHENTICATION & AUTHORIZATION CHECKS

// Check if user is logged in
if (!isset($_SESSION['auth']) || $_SESSION['auth']['type'] !== 'user') {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit();
}

// Check if OTP has been verified
if (!isset($_SESSION['otp_verified']) || $_SESSION['otp_verified'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'OTP has not been verified.']);
    exit();
}

// INPUT VALIDATION
$input = json_decode(file_get_contents('php://input'), true);
$requestedAccountType = $input['account_type'] ?? null;

// Validate account type
if (!$requestedAccountType || !in_array($requestedAccountType, ['savings', 'credit'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid account type is required.']);
    exit();
}

try {
    $db = db_connect();
    $db->begin_transaction();
    
    $userId = $_SESSION['auth']['id'];
    
    // ============================================================================
    // ACCOUNT LIMIT VALIDATION
    // ============================================================================
    
    // Get all user accounts
    $accountQuery = $db->prepare('SELECT account_type, status FROM account WHERE user_id = ?');
    $accountQuery->bind_param('i', $userId);
    $accountQuery->execute();
    $userAccounts = $accountQuery->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // Filter active accounts
    $activeAccounts = array_filter($userAccounts, fn($account) => $account['status'] === 'active');
    $totalActiveAccounts = count($activeAccounts);

    if ($totalActiveAccounts >= 3) {
        throw new Exception('You have reached the maximum number of active accounts (3).');
    }

    // Count accounts by type
    $savingsAccountCount = count(array_filter($activeAccounts, fn($account) => $account['account_type'] === 'savings'));
    $creditAccountCount = count(array_filter($activeAccounts, fn($account) => $account['account_type'] === 'credit'));

    if ($requestedAccountType === 'savings' && $savingsAccountCount >= 2) {
        throw new Exception('You can only have a maximum of 2 savings accounts.');
    }

    if ($requestedAccountType === 'credit' && $creditAccountCount >= 1) {
        throw new Exception('You can only have a maximum of 1 credit account.');
    }
    
    // FETCH USER PROFILE DATA
    $profileQuery = $db->prepare('
        SELECT first_name, last_name, phone_number, date_of_birth, nationality, 
               street, city, zip_code, country, email, id_type, id_image 
        FROM user 
        WHERE user_id = ?
    ');
    $profileQuery->bind_param('i', $userId);
    $profileQuery->execute();
    $profileQuery->bind_result(
        $firstName, $lastName, $phoneNumber, $dateOfBirth, $nationality,
        $street, $city, $zipCode, $country, $email, $idType, $idImage
    );
    $profileQuery->fetch();
    $profileQuery->close();
    
    // CREATE ACCOUNT REQUEST
    $requestQuery = $db->prepare('
        INSERT INTO registration_request (
            user_id, request_type, account_type, first_name, last_name, 
            phone_number, date_of_birth, nationality, street, city, 
            zip_code, country, email, id_type, id_image, status, created_at
        ) VALUES (?, "add_account", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", NOW())
    ');
    
    $requestQuery->bind_param(
        'isssssssssssss',
        $userId, $requestedAccountType, $firstName, $lastName, $phoneNumber,
        $dateOfBirth, $nationality, $street, $city, $zipCode, $country, $email, $idType, $idImage
    );
    $requestQuery->execute();
    
    // Commit transaction
    $db->commit();
    
    // Clear OTP verification flag
    unset($_SESSION['otp_verified']);
    
    // EMAIL NOTIFICATION
    try {
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

        $emailTemplate = file_get_contents(__DIR__ . '/email-templates/additional-account-email.html');
        $emailCSS = file_get_contents(__DIR__ . '/email-templates/additional-account-email.css');
        
        $emailTemplate = str_replace('{{FIRST_NAME}}', $firstName, $emailTemplate);
        $emailTemplate = str_replace('{{LAST_NAME}}', $lastName, $emailTemplate);
        $emailTemplate = str_replace('{{ACCOUNT_TYPE}}', ucfirst($requestedAccountType), $emailTemplate);
        
        $emailTemplate = str_replace(
            '<link rel="stylesheet" href="additional-account-email.css">',
            '<style>' . $emailCSS . '</style>',
            $emailTemplate
        );

        $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
        $mail->addAddress($email);
        $mail->Subject = 'Additional Account Request Submitted - StackOvercash';
        $mail->isHTML(true);
        $mail->Body = $emailTemplate;

        $mail->send();
        error_log("Additional account request email sent successfully to: " . $email);
        
    } catch (Exception $emailError) {
        error_log("Failed to send additional account request email: " . $emailError->getMessage());
    }

    // SUCCESS RESPONSE
    echo json_encode([
        'success' => true,
        'message' => 'Your request to open a new account has been submitted for review.'
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($db)) {
        $db->rollback();
    }
    
    http_response_code(400); // Bad Request for business logic errors
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
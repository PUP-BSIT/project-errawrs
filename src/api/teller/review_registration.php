<?php
use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

// Prevent PHP from displaying errors directly
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set content type to JSON
header('Content-Type: application/json');

// Custom error handler to capture all errors
function handleError($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    $error = [
        'success' => false,
        'error' => 'Server error occurred',
        'details' => $errstr,
        'debug_info' => [
            'type' => 'error',
            'file' => basename($errfile),
            'line' => $errline
        ]
    ];
    echo json_encode($error);
    exit();
}

// Set custom error handler
set_error_handler('handleError');

// Handle uncaught exceptions
function handleException($e) {
    error_log("Uncaught Exception: " . $e->getMessage() . "\nStack trace: " . $e->getTraceAsString());
    $error = [
        'success' => false,
        'error' => 'Server error occurred',
        'details' => $e->getMessage(),
        'debug_info' => [
            'type' => 'exception',
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]
    ];
    echo json_encode($error);
    exit();
}

// Set exception handler
set_exception_handler('handleException');

try {
    require_once __DIR__ . '/../../config/SessionManager.php';
    require_once __DIR__ . '/../../../vendor/autoload.php';
    require_once __DIR__ . '/../../config/database.php';

    error_log("Starting registration review process");

    $session = SessionManager::getInstance();

    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed');
    }

    // Validate authentication
    if (!$session->isAuthenticated() || $_SESSION['auth']['type'] !== 'teller') {
        throw new Exception('Unauthorized access');
    }

    // Update session activity
    $session->updateActivity();

    // Get and validate input
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['registration_id']) || !isset($input['action'])) {
        throw new Exception('Missing required fields: registration_id or action');
    }

    error_log("Processing registration ID: {$input['registration_id']}, Action: {$input['action']}");

    $registration_id = $input['registration_id'];
    $action = $input['action'];
    $teller_id = $session->getSessionData()['id'];

    if (!in_array($action, ['approve', 'deny'])) {
        throw new Exception('Invalid action. Must be either approve or deny');
    }

    // Connect to database
    $db = db_connect();
    error_log("Database connection established");

    $db->begin_transaction();
    error_log("Transaction started");

    try {
        // Get registration details
    $stmt = $db->prepare('SELECT * FROM registration_request WHERE registration_id = ?');
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $db->error);
        }
        
    $stmt->bind_param('i', $registration_id);
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
    $result = $stmt->get_result();
    $registration = $result->fetch_assoc();

    if (!$registration) {
        throw new Exception('Registration request not found');
    }

        error_log("Found registration for: {$registration['first_name']} {$registration['last_name']}");

        if ($registration['status'] !== 'pending') {
            throw new Exception('Registration has already been reviewed');
        }

        // Update registration status
        $status = $action === 'approve' ? 'approved' : 'rejected';
        $updateStmt = $db->prepare('
            UPDATE registration_request 
            SET status = ?
            WHERE registration_id = ?
        ');
        
        if (!$updateStmt) {
            throw new Exception("Prepare update failed: " . $db->error);
        }
        
        $updateStmt->bind_param('si', $status, $registration_id);
        if (!$updateStmt->execute()) {
            throw new Exception("Update failed: " . $updateStmt->error);
        }

        error_log("Updated registration status to: $status");

        if ($action === 'approve') {
            // Log approval process start
            error_log("Starting approval process for registration $registration_id");

            if ($registration['request_type'] === 'add_account') {
                // Only add a new account for the existing user
                $user_id = $registration['user_id'];
                
                // Get user details for email
                $userStmt = $db->prepare('SELECT first_name, last_name, email FROM user WHERE user_id = ?');
                $userStmt->bind_param('i', $user_id);
                $userStmt->execute();
                $userResult = $userStmt->get_result();
                $userData = $userResult->fetch_assoc();
                
                if (!$userData) {
                    throw new Exception('User not found for add account request');
                }
                
                // Generate account number
                $seqResult = $db->query('SELECT MAX(CAST(SUBSTRING(account_number, 9) AS UNSIGNED)) as last_seq FROM account');
                $seqRow = $seqResult->fetch_assoc();
                $nextSeq = ($seqRow['last_seq'] ?? 0) + 1;
                $year = date('y');
                $accountNumber = sprintf('544%s0%06d', $year, $nextSeq);
                
                // Insert into account table
                $insertAccount = $db->prepare('
                    INSERT INTO account (user_id, account_number, balance, status, account_type, created_at)
                    VALUES (?, ?, 0.00, "active", ?, NOW())
                ');
                $insertAccount->bind_param('iss', $user_id, $accountNumber, $registration['account_type']);
                if (!$insertAccount->execute()) {
                    throw new Exception('Failed to create bank account: ' . $insertAccount->error);
                }
                
                // Send email notification about new account
                error_log("Sending add account approval email to: {$userData['email']}");
                
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
                $mail->addAddress($userData['email']);
                $mail->Subject = 'Additional Account Approved';
                $mail->Body = "Hello {$userData['first_name']},\n\n"
                    . "Your request for an additional account has been approved!\n\n"
                    . "New Account Details:\n"
                    . "Account Number: $accountNumber\n"
                    . "Account Type: " . ucfirst($registration['account_type']) . "\n"
                    . "Status: Active\n\n"
                    . "You can view your new account in your dashboard at: https://dev.stackovercash.site/user/account.html\n\n"
                    . "Thank you for choosing our bank!";

                try {
                    $mail->send();
                    error_log("Add account approval email sent successfully");
                } catch (Exception $e) {
                    error_log("Failed to send add account approval email: " . $e->getMessage());
                    // Don't throw here, we want to complete the transaction even if email fails
                }
                
                $message = "Additional account approved. Account created with number: $accountNumber";
            } else {
                // Existing logic for new registration (create user, then account)
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

                // Generate password with mixed case
                $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                $password = '';
                // Ensure at least one lowercase and one uppercase
                $password .= $chars[random_int(0, 25)]; // lowercase
                $password .= $chars[random_int(26, 51)]; // uppercase
                // Fill the rest randomly
                for($i = 0; $i < 14; $i++) {
                    $password .= $chars[random_int(0, strlen($chars) - 1)];
                }
                // Shuffle the password to mix the guaranteed cases
                $password = str_shuffle($password);
            $password_hash = password_hash($password, PASSWORD_DEFAULT);

                // Log user creation
                error_log("Creating user account with username: $username");

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
                    if (!$insertUser->execute()) {
                        throw new Exception('Failed to create user account: ' . $insertUser->error);
                    }
                $user_id = $db->insert_id;

                // Log account creation
                error_log("Creating bank account for user ID: $user_id");

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
                    if (!$insertAccount->execute()) {
                        throw new Exception('Failed to create bank account: ' . $insertAccount->error);
                    }

                    // Log email sending
                    error_log("Sending approval email to: {$registration['email']}");

                // Send email
                $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
                $dotenv->load();

                $emailTemplate = file_get_contents(__DIR__ . '/email-templates/registration-approved-email.html');
                $emailCSS = file_get_contents(__DIR__ . '/email-templates/registration-email.css');
                $emailTemplate = str_replace([
                  '{{FIRST_NAME}}',
                  '{{LAST_NAME}}',
                  '{{USERNAME}}',
                  '{{PASSWORD}}',
                  '{{ACCOUNT_NUMBER}}',
                  '<link rel="stylesheet" href="registration-email.css">'
                ], [
                  htmlspecialchars($registration['first_name']),
                  htmlspecialchars($registration['last_name']),
                  htmlspecialchars($username),
                  htmlspecialchars($password),
                  htmlspecialchars($accountNumber),
                  '<style>' . $emailCSS . '</style>'
                ], $emailTemplate);

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
                $mail->isHTML(true);
                $mail->Body = $emailTemplate;
                $mail->AltBody = "Hello {$registration['first_name']},\n\nYour registration has been approved! Here are your account details:\n\nUsername: $username\nPassword: $password\nAccount Number: $accountNumber\n\nYou can login to your account at: https://dev.stackovercash.site/login\n\nPlease change your password after your first login.\n\nThank you for choosing our bank!";
                try {
                $mail->send();
                        error_log("Approval email sent successfully");
                    } catch (Exception $e) {
                        error_log("Failed to send approval email: " . $e->getMessage());
                        // Don't throw here, we want to complete the transaction even if email fails
                    }

                $message = "Registration approved. Account created with ID: $user_id and account number: $accountNumber";
            }
        } else {
            // Deny: update status to rejected (don't delete the record)
            // The status is already updated above in the common update section
            // No additional action needed here for denial

            // Send denial email using HTML template
            $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
            $dotenv->load();

            $emailTemplate = file_get_contents(__DIR__ . '/../user/email-templates/registration-denied-email.html');
            $emailCSS = file_get_contents(__DIR__ . '/../user/email-templates/email-template.css');
            $emailTemplate = str_replace([
                '{{FIRST_NAME}}',
                '{{LAST_NAME}}',
                '<link rel="stylesheet" href="email-template.css">'
            ], [
                htmlspecialchars($registration['first_name']),
                htmlspecialchars($registration['last_name']),
                '<style>' . $emailCSS . '</style>'
            ], $emailTemplate);

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
            $mail->isHTML(true);
            $mail->Body = $emailTemplate;
            $mail->AltBody = "Hello {$registration['first_name']},\n\nWe regret to inform you that your registration has been denied. Please contact our support team for more information.\n\nThank you for your interest in our bank.";

            try {
                $mail->send();
                error_log("Denial email sent successfully");
            } catch (Exception $e) {
                error_log("Failed to send denial email: " . $e->getMessage());
                // Don't throw here, we want to complete the transaction even if email fails
            }

            $message = "Registration denied.";
        }

        $db->commit();
        error_log("Transaction committed successfully");

        echo json_encode([
            'success' => true,
            'message' => $message
        ]);

    } catch (Exception $e) {
        error_log("Error in transaction: " . $e->getMessage());
        $db->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("Final error handler: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'type' => 'exception',
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]
    ]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($updateStmt)) $updateStmt->close();
    if (isset($db)) $db->close();
    error_log("Review process completed");
}
?>

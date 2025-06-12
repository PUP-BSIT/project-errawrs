<?php
     session_start();
     require_once __DIR__ . '/../../config/database.php';
     require_once __DIR__ . '/../../../vendor/autoload.php';

     use PHPMailer\PHPMailer\PHPMailer;
     use PHPMailer\PHPMailer\Exception;

     header('Content-Type: application/json');

     if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
         http_response_code(405);
         echo json_encode(['success' => false, 'error' => 'Method not allowed']);
         exit();
     }

     // Validate required environment variables
     $required_env = ['GMAIL_HOST', 'GMAIL_PORT', 'GMAIL_USERNAME', 'GMAIL_PASSWORD', 'GMAIL_FROM_EMAIL', 'GMAIL_FROM_NAME'];
     foreach ($required_env as $key) {
         if (empty($_ENV[$key])) {
             http_response_code(500);
             echo json_encode(['success' => false, 'error' => "Missing environment variable: $key"]);
             exit();
         }
     }

     $input = json_decode(file_get_contents('php://input'), true);
     if (!$input) {
         http_response_code(400);
         echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
         exit();
     }

     // Validate required fields
     $required_fields = ['email', 'first_name', 'last_name', 'username', 'status'];
     foreach ($required_fields as $field) {
         if (!isset($input[$field]) || empty($input[$field])) {
             http_response_code(400);
             echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
             exit();
         }
     }

     // Additional fields from registration form
     $optional_fields = [
         'phone_number' => $input['phone_number'] ?? 'Not provided',
         'date_of_birth' => $input['date_of_birth'] ?? 'Not provided',
         'nationality' => $input['nationality'] ?? 'Not provided',
         'street' => $input['street'] ?? 'Not provided',
         'city' => $input['city'] ?? 'Not provided',
         'zip_code' => $input['zip_code'] ?? 'Not provided',
         'country' => $input['country'] ?? 'Not provided',
         'id_type' => $input['id_type'] ?? 'Not provided'
     ];

     $status = $input['status'];
     $to_email = $input['email'];
     $first_name = $input['first_name'];
     $last_name = $input['last_name'];
     $username = $input['username'];

     try {
         $db = db_connect();
         $db->begin_transaction();

         // If status is approved, create the user and account
         if ($status === 'approved') {
             $checkStmt = $db->prepare('SELECT user_id FROM user WHERE username = ? OR phone_number = ?');
             $checkStmt->bind_param('ss', $username, $optional_fields['phone_number']);
             $checkStmt->execute();
             if ($checkStmt->get_result()->num_rows > 0) {
                 throw new Exception('Username or phone number already registered');
             }

             $password_hash = password_hash($input['password'], PASSWORD_DEFAULT);
             $userStmt = $db->prepare(
                 'INSERT INTO user (username, password_hash, first_name, last_name, phone_number, email, date_of_birth, nationality, street, city, zip_code, country, security_q1, security_q2, security_q3, id_type, id_image) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
             );
             $userStmt->bind_param(
                 'sssssssssssssssss',
                 $username, $password_hash, $first_name, $last_name, $optional_fields['phone_number'],
                 $to_email, $optional_fields['date_of_birth'], $optional_fields['nationality'],
                 $optional_fields['street'], $optional_fields['city'], $optional_fields['zip_code'],
                 $optional_fields['country'], $input['security_q1'] ?? 'Not provided',
                 $input['security_q2'] ?? 'Not provided', $input['security_q3'] ?? 'Not provided',
                 $optional_fields['id_type'], $input['id_image'] ?? null
             );
             $userStmt->execute();
             $user_id = $userStmt->insert_id;

             $year = date('y');
             $seqResult = $db->query('SELECT MAX(CAST(SUBSTRING(account_number, 9) AS UNSIGNED)) as last_seq FROM account');
             $seqRow = $seqResult->fetch_assoc();
             $nextSeq = ($seqRow['last_seq'] ?? 0) + 1;
             $account_number = sprintf('544%s0%06d', $year, $nextSeq);

             $accountStmt = $db->prepare('INSERT INTO account (user_id, account_number, balance, status, account_type) VALUES (?, ?, 0.00, "active", "savings")');
             $accountStmt->bind_param('is', $user_id, $account_number);
             $accountStmt->execute();
         }

         // Prepare email content based on status
         $subject = '';
         $body = '';
         switch ($status) {
             case 'pending':
                 $subject = 'StackOvercash Registration - Under Review';
                 $body = "Dear $first_name $last_name,\n\nThank you for registering with StackOvercash. Your application is under review. Details: Username: $username, Full Name: $first_name $last_name, Email: $to_email, Phone: {$optional_fields['phone_number']}, DOB: {$optional_fields['date_of_birth']}, Nationality: {$optional_fields['nationality']}, Address: {$optional_fields['street']}, {$optional_fields['city']}, {$optional_fields['zip_code']}, {$optional_fields['country']}, ID Type: {$optional_fields['id_type']}.\n\nYou will receive another email once reviewed.\n\nBest,\nStackOvercash Team";
                 break;
             case 'approved':
                 $subject = 'StackOvercash Registration - Approved';
                 $body = "Dear $first_name $last_name,\n\nCongratulations! Your registration is approved. Login with: Username: $username, Account Number: $account_number, Account Type: Savings, Email: $to_email.\n\nLog in at https://yourdomain.com/user/login_account_holder.html.\n\nBest,\nStackOvercash Team";
                 break;
             case 'denied':
                 $subject = 'StackOvercash Registration - Denied';
                 $body = "Dear $first_name $last_name,\n\nWe regret to inform you that your registration was denied. Contact support@yourdomain.com for assistance.\n\nBest,\nStackOvercash Team";
                 break;
             default:
                 throw new Exception('Invalid status provided');
         }

         // Send email using PHPMailer with Gmail SMTP
         $mail = new PHPMailer(true);
         $mail->isSMTP();
         $mail->Host = $_ENV['GMAIL_HOST'];
         $mail->SMTPAuth = true;
         $mail->Username = $_ENV['GMAIL_USERNAME'];
         $mail->Password = $_ENV['GMAIL_PASSWORD'];
         $mail->SMTPSecure = 'tls';
         $mail->Port = $_ENV['GMAIL_PORT'];
         $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
         $mail->addAddress($to_email, "$first_name $last_name");
         $mail->Subject = $subject;
         $mail->Body = $body;

         $mail->send();

         if ($status === 'approved') {
             $db->commit();
         }
         echo json_encode([
             'success' => true,
             'message' => "Email sent successfully with status: $status",
             'account_number' => $status === 'approved' ? $account_number : null
         ]);

     } catch (Exception $e) {
         if (isset($db)) $db->rollback();
         error_log("Error in send_registration_email.php: " . $e->getMessage());
         http_response_code(500);
         echo json_encode(['success' => false, 'error' => $e->getMessage()]);
     } finally {
         if (isset($userStmt)) $userStmt->close();
         if (isset($accountStmt)) $accountStmt->close();
         if (isset($checkStmt)) $checkStmt->close();
         if (isset($db)) db_close($db);
     }
     ?>
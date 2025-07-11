<?php
  require_once __DIR__ . '/../../../vendor/autoload.php'; // Adjusted path
  require_once __DIR__ . '/../../config/database.php';
  require_once __DIR__ . '/../../config/SessionManager.php';
  
  $sessionManager = SessionManager::getInstance();
  $sessionManager->initSession();
  
  use Dotenv\Dotenv;
  use PHPMailer\PHPMailer\PHPMailer;
  use PHPMailer\PHPMailer\Exception;

  header('Content-Type: application/json');

  // Debug session data
  error_log("Submit Registration - Session data: " . print_r($_SESSION, true));
  error_log("Submit Registration - OTP verified flag: " . (isset($_SESSION['otp_verified']) ? $_SESSION['otp_verified'] : 'NOT SET'));

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['success' => false, 'error' => 'Method not allowed']);
      exit();
  }

  if (!isset($_SESSION['otp_verified']) || !$_SESSION['otp_verified']) {
      http_response_code(403);
      echo json_encode(['success' => false, 'error' => 'Phone number not verified']);
      exit();
  }

  // Handle file upload
  if (!isset($_FILES['id_image']) || $_FILES['id_image']['error'] !== UPLOAD_ERR_OK) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'ID image is required']);
      exit();
  }

  // Get other form data
  $input = json_decode($_POST['data'] ?? '{}', true);
  $required_fields = [
      'first_name', 'last_name', 'phone_number', 'date_of_birth',
      'nationality', 'street', 'city', 'zip_code', 'country',
      'email', 'id_type'
  ];
  foreach ($required_fields as $field) {
      if (empty($input[$field])) {
          http_response_code(400);
          echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
          exit();
      }
  }

  // Validate phone number: must start with +639 and be 13 characters
  $raw_phone = $input['phone_number'];
  if (!preg_match('/^\+639\d{9}$/', $raw_phone)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Invalid phone number format. Must start with +639 and be 13 characters.']);
      exit();
  }
  $input['phone_number'] = $raw_phone;

  try {
      $db = db_connect();
      $db->begin_transaction();

      // Check if phone number already exists in registration_request
      $checkPhoneStmt = $db->prepare('SELECT registration_id FROM registration_request WHERE phone_number = ? AND status = "pending"');
      $checkPhoneStmt->bind_param('s', $input['phone_number']);
      $checkPhoneStmt->execute();
      $phoneResult = $checkPhoneStmt->get_result();
      
      if ($phoneResult->num_rows > 0) {
          throw new Exception('A registration with this phone number is already pending. Please wait for approval or contact support.');
      }

      // Check if phone number already exists in user table
      $checkUserStmt = $db->prepare('SELECT user_id FROM user WHERE phone_number = ?');
      $checkUserStmt->bind_param('s', $input['phone_number']);
      $checkUserStmt->execute();
      $userResult = $checkUserStmt->get_result();
      
      if ($userResult->num_rows > 0) {
          throw new Exception('This phone number is already registered. Please use a different phone number or contact support.');
      }

      // Insert into registration_request table
      $stmt = $db->prepare('INSERT INTO registration_request (first_name, last_name, phone_number, date_of_birth, nationality, street, city, zip_code, country, email, id_type, id_image, status, request_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", "new_registration")');
      
      // Create placeholder for id_image path
      $id_image_path = '';
      
      $stmt->bind_param(
          'ssssssssssss',
          $input['first_name'], $input['last_name'], $input['phone_number'], $input['date_of_birth'],
          $input['nationality'], $input['street'], $input['city'], $input['zip_code'], $input['country'],
          $input['email'], $input['id_type'], $id_image_path
      );
      $stmt->execute();
      $registration_id = $db->insert_id;

      // Create directory for this registration
      $upload_dir = __DIR__ . '/uploads/registration/' . $registration_id;
      if (!file_exists($upload_dir)) {
          mkdir($upload_dir, 0777, true);
      }

      // Get file extension
      $file_extension = strtolower(pathinfo($_FILES['id_image']['name'], PATHINFO_EXTENSION));
      $allowed_extensions = ['jpg', 'jpeg', 'png', 'pdf'];
      
      if (!in_array($file_extension, $allowed_extensions)) {
          throw new Exception('Invalid file type. Allowed types: ' . implode(', ', $allowed_extensions));
      }

      // Create filename with registration ID and ID type
      $filename = $registration_id . '_' . $input['id_type'] . '.' . $file_extension;
      $file_path = $upload_dir . '/' . $filename;
      
      // Move uploaded file
      if (!move_uploaded_file($_FILES['id_image']['tmp_name'], $file_path)) {
          throw new Exception('Failed to upload file');
      }

      // Update the registration_request with the correct file path
      $relative_path = 'uploads/registration/' . $registration_id . '/' . $filename;
      $update_stmt = $db->prepare('UPDATE registration_request SET id_image = ? WHERE registration_id = ?');
      $update_stmt->bind_param('si', $relative_path, $registration_id);
      $update_stmt->execute();

      // Send review email
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

      // Read the email template
      $emailTemplate = file_get_contents(__DIR__ . '/email-templates/registration-email.html');
      $emailCSS = file_get_contents(__DIR__ . '/email-templates/registration-email.css');
      
      // Replace placeholders in the template
      $emailTemplate = str_replace('{{FIRST_NAME}}', $input['first_name'], $emailTemplate);
      $emailTemplate = str_replace('{{LAST_NAME}}', $input['last_name'], $emailTemplate);
      $emailTemplate = str_replace('{{REGISTRATION_ID}}', $registration_id, $emailTemplate);
      
      // Embed CSS inline for email compatibility
      $emailTemplate = str_replace(
          '<link rel="stylesheet" href="registration-email.css">',
          '<style>' . $emailCSS . '</style>',
          $emailTemplate
      );

      $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
      $mail->addAddress($input['email']);
      $mail->Subject = 'Registration Submitted Successfully';
      $mail->isHTML(true);
      $mail->Body = $emailTemplate;

      $mail->send();

      $db->commit();
      unset($_SESSION['otp_verified']);

      echo json_encode([
          'success' => true,
          'message' => 'Registration submitted. Check your email for review status.',
          'registration_id' => $registration_id
      ]);

  } catch (Exception $e) {
      if (isset($db)) $db->rollback();
      error_log("Registration Request Error: " . $e->getMessage());
      http_response_code(500);
      echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  } finally {
      if (isset($stmt)) $stmt->close();
      if (isset($update_stmt)) $update_stmt->close();
      if (isset($db)) $db->close();
  }
  ?>

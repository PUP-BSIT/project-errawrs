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
  define('PROJECT_ROOT', realpath(__DIR__ . '/../../..'));

  // Load environment variables and dependencies
  require_once PROJECT_ROOT . '/vendor/autoload.php';
  
  // Initialize environment variables
  $dotenv = Dotenv\Dotenv::createImmutable(PROJECT_ROOT);
  $dotenv->load();

  // Enable error reporting and logging
  error_reporting(E_ALL);
  ini_set('display_errors', 0); // Disable display errors in production
  ini_set('log_errors', 1);
  ini_set('error_log', PROJECT_ROOT . '/logs/error.log');

  // Include SessionManager
  require_once PROJECT_ROOT . '/src/config/SessionManager.php';
  
  // Initialize SessionManager to start or resume the session
  $sessionManager = SessionManager::getInstance();

  // Set JSON header first before any output
  header("Access-Control-Allow-Origin: *");
  header("Access-Control-Allow-Methods: POST");
  header("Access-Control-Allow-Headers: Content-Type, Authorization");
  header("Content-Type: application/json");
  header("Access-Control-Allow-Credentials: true");

  // Function to handle errors
  function sendError($message, $code = 400) {
      error_log("Create Teller Error: " . $message);
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

  // Log the raw input for debugging
  error_log("Raw input: " . $input);

  $data = json_decode($input, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
      sendError('Invalid JSON: ' . json_last_error_msg() . '. Raw input: ' . $input);
  }

  if (!isset($data['first_name']) || !isset($data['last_name']) || !isset($data['email'])) {
      sendError('Missing required fields');
  }

  // Validate email format
  if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
      sendError('Invalid email format');
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
      $db->begin_transaction();

      // Check if email already exists
      $stmt = $db->prepare("SELECT teller_id FROM teller WHERE email = ?");
      if (!$stmt) {
          throw new Exception("Database prepare failed: " . $db->error);
      }
      $stmt->bind_param("s", $data['email']);
      if (!$stmt->execute()) {
          throw new Exception("Database execute failed: " . $stmt->error);
      }
      $result = $stmt->get_result();
      if ($result->num_rows > 0) {
          sendError('Email already exists');
      }

      // Generate teller number
      $stmt = $db->prepare("SELECT MAX(CAST(SUBSTRING(teller_number, 2) AS UNSIGNED)) as max_num FROM teller WHERE teller_number LIKE 'T%'");
      if (!$stmt) {
          throw new Exception("Database prepare failed: " . $db->error);
      }
      if (!$stmt->execute()) {
          throw new Exception("Database execute failed: " . $stmt->error);
      }
      $result = $stmt->get_result();
      $row = $result->fetch_assoc();
      $next_num = ($row['max_num'] ?? 0) + 1;
      $teller_number = sprintf("T%06d", $next_num);

      // Generate a temporary password hash (will be updated when teller sets their password)
      $temp_password = bin2hex(random_bytes(8)); // Generate a random 16-character string
      $password_hash = password_hash($temp_password, PASSWORD_DEFAULT);

      // Insert new teller with pending status
      $status = 'pending';
      $stmt = $db->prepare("INSERT INTO teller (teller_number, first_name, last_name, email, status, password_hash) VALUES (?, ?, ?, ?, ?, ?)");
      if (!$stmt) {
          throw new Exception("Database prepare failed: " . $db->error);
      }
      $stmt->bind_param("ssssss", $teller_number, $data['first_name'], $data['last_name'], $data['email'], $status, $password_hash);
      if (!$stmt->execute()) {
          throw new Exception("Database execute failed: " . $stmt->error);
      }

      $teller_id = $db->insert_id;

      // Send verification email
      $templatePath = PROJECT_ROOT . '/src/api/user/email-templates/teller-account-setup-email.html';
      $template = file_get_contents($templatePath);
      $cssPath = PROJECT_ROOT . '/src/api/user/email-templates/registration-email.css';
      $css = file_get_contents($cssPath);
      $set_password_link = getBaseUrl() . '/teller/set_password.html?teller_email=' . urlencode($data['email']);
      $htmlBody = str_replace([
        '{{FIRST_NAME}}',
        '{{LAST_NAME}}',
        '{{TELLER_NUMBER}}',
        '{{SET_PASSWORD_LINK}}',
        '<link rel="stylesheet" href="registration-email.css">'
      ], [
        htmlspecialchars($data['first_name']),
        htmlspecialchars($data['last_name']),
        htmlspecialchars($teller_number),
        $set_password_link,
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
      $mail->addAddress($data['email'], "{$data['first_name']} {$data['last_name']}");
      $mail->Subject = 'Complete Your Teller Account Setup';
      $mail->isHTML(true);
      $mail->Body = $htmlBody;
      $mail->AltBody = "Dear {$data['first_name']} {$data['last_name']},\n\nPlease set your password using the following link: $set_password_link\n\nIf you did not request this account, please ignore this email.\n\nBest regards,\nStackOvercash Team";
      $mail->send();

      $db->commit();
      echo json_encode([
          'success' => true,
          'message' => 'Teller created successfully. A verification email has been sent.',
          'teller' => [
              'teller_id' => $teller_id,
              'teller_number' => $teller_number,
              'first_name' => $data['first_name'],
              'last_name' => $data['last_name'],
              'email' => $data['email'],
              'status' => 'pending'
          ]
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
      if (isset($db)) db_close($db);
  }
  ?>
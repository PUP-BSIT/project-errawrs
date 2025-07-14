<?php
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
  header("Content-Type: application/json");

  // Function to handle errors
  function sendError($message, $code = 400) {
      error_log("Create Admin Error: " . $message);
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

  if (!isset($data['username']) || !isset($data['first_name']) || !isset($data['last_name']) || !isset($data['email'])) {
      sendError('Missing required fields: username, first_name, last_name, email');
  }

  // Validate email format
  if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
      sendError('Invalid email format');
  }

  // Validate username (alphanumeric and underscore only)
  if (!preg_match('/^[a-zA-Z0-9_]+$/', $data['username'])) {
      sendError('Username can only contain letters, numbers, and underscores');
  }

  // Validate username length
  if (strlen($data['username']) < 3 || strlen($data['username']) > 50) {
      sendError('Username must be between 3 and 50 characters');
  }

  try {
      $db = db_connect();
      $db->begin_transaction();

      // Check if username already exists
      $stmt = $db->prepare("SELECT admin_id FROM admin WHERE username = ?");
      if (!$stmt) {
          throw new Exception("Database prepare failed: " . $db->error);
      }
      $stmt->bind_param("s", $data['username']);
      if (!$stmt->execute()) {
          throw new Exception("Database execute failed: " . $stmt->error);
      }
      $result = $stmt->get_result();
      if ($result->num_rows > 0) {
          sendError('Username already exists');
      }

      // Check if email already exists
      $stmt = $db->prepare("SELECT admin_id FROM admin WHERE email = ?");
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

      // Generate a secure password hash
      $password = 'Admin@123'; // Default password - should be changed on first login
      $password_hash = password_hash($password, PASSWORD_DEFAULT);

      // Insert new admin
      $stmt = $db->prepare("INSERT INTO admin (username, password_hash, first_name, last_name, email) VALUES (?, ?, ?, ?, ?)");
      if (!$stmt) {
          throw new Exception("Database prepare failed: " . $db->error);
      }
      $stmt->bind_param("sssss", $data['username'], $password_hash, $data['first_name'], $data['last_name'], $data['email']);
      if (!$stmt->execute()) {
          throw new Exception("Database execute failed: " . $stmt->error);
      }

      $admin_id = $db->insert_id;

      $db->commit();
      
      echo json_encode([
          'success' => true,
          'message' => 'Admin created successfully.',
          'admin' => [
              'admin_id' => $admin_id,
              'username' => $data['username'],
              'first_name' => $data['first_name'],
              'last_name' => $data['last_name'],
              'email' => $data['email'],
              'default_password' => $password
          ]
      ]);
      
  } catch (mysqli_sql_exception $e) {
      if (isset($db)) $db->rollback();
      error_log("Database Error: " . $e->getMessage());
      sendError('Database error: ' . $e->getMessage(), 500);
  } catch (Exception $e) {
      if (isset($db)) $db->rollback();
      error_log("General Error: " . $e->getMessage());
      sendError('An error occurred: ' . $e->getMessage(), 500);
  }
?> 
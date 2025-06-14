<?php
  // Ensure no output before session_start
  error_reporting(E_ALL);
  ini_set('display_errors', 0);
  
  // Debug session path
  error_log("Session save path: " . ini_get('session.save_path'));
  
  // Set session cookie parameters before starting session
  session_set_cookie_params([
      'lifetime' => 0,
      'path' => '/',
      'domain' => '',  // Leave empty for localhost
      'secure' => false,  // Set to true in production
      'httponly' => true,
      'samesite' => 'Lax'
  ]);
  
  // Start the session
  session_start();
  
  // Include required files
  // Remove dependency on missing vendor/autoload.php
  // require_once __DIR__ . '/../../../vendor/autoload.php';
  require_once __DIR__ . '/../../config/database.php';
  
  // Set content type
  header('Content-Type: application/json');
  header("Access-Control-Allow-Origin: *");
  header("Access-Control-Allow-Methods: POST, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type");

  // Debug session info
  error_log("Session ID in verify_otp: " . session_id());
  error_log("Full SESSION data: " . print_r($_SESSION, true));
  
  // Check request method
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['success' => false, 'error' => 'Method not allowed']);
      exit();
  }

  // Parse input
  $input = json_decode(file_get_contents('php://input'), true);
  if (!isset($input['otp']) || !isset($input['phone_number'])) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'OTP and phone number are required']);
      exit();
  }

  $otp = $input['otp'];
  $phone_number = $input['phone_number'];

  // Debug log the input and session
  error_log("Verify OTP Input: " . print_r($input, true));
  error_log("Session ID: " . session_id());
  error_log("Session Data: " . print_r($_SESSION, true));

  if (!preg_match('/^\d{6}$/', $otp)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Invalid OTP format']);
      exit();
  }

  // Normalize phone number to match send_otp.php format
  $phone = preg_replace('/[^0-9+]/', '', $phone_number);
  if (preg_match('/^\+?639\d{9}$/', $phone)) {
      $phone = '0' . substr($phone, -10);
  }

  error_log("Original phone: " . $phone_number . ", Normalized phone: " . $phone);

  // Check if OTP exists in session
  $otp_found = false;
  $otp_valid = false;
  $otp_expired = false;
  $too_many_attempts = false;
  $storedOTP = null;
  
  // First try to get OTP from session
  if (isset($_SESSION['otp']) && is_array($_SESSION['otp'])) {
      $otp_found = true;
      $storedOTP = $_SESSION['otp'];
      error_log("OTP found in session for phone: " . $storedOTP['phone_number']);
  } else {
      error_log("No OTP found in session, checking database");
      
      // If not in session, try to get from database
      try {
          $conn = db_connect();
          
          // Debug database connection
          error_log("Database connection established");
          
          // Check if table exists
          $table_check = $conn->query("SHOW TABLES LIKE 'otp_codes'");
          if ($table_check->num_rows == 0) {
              error_log("otp_codes table does not exist, creating it");
              $conn->query("CREATE TABLE IF NOT EXISTS otp_codes (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  phone_number VARCHAR(20) NOT NULL,
                  otp_code VARCHAR(10) NOT NULL,
                  created_at INT NOT NULL,
                  attempts INT DEFAULT 0,
                  INDEX (phone_number)
              )");
          } else {
              error_log("otp_codes table exists");
          }
          
          $stmt = $conn->prepare("SELECT * FROM otp_codes WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1");
          if (!$stmt) {
              error_log("Failed to prepare statement: " . $conn->error);
              throw new Exception("Database error: " . $conn->error);
          }
          
          $stmt->bind_param('s', $phone);
          $stmt->execute();
          $result = $stmt->get_result();
          
          if ($row = $result->fetch_assoc()) {
              $otp_found = true;
              $storedOTP = [
                  'code' => $row['otp_code'],
                  'phone_number' => $row['phone_number'],
                  'created_at' => $row['created_at'],
                  'attempts' => $row['attempts']
              ];
              error_log("OTP found in database for phone: " . $storedOTP['phone_number']);
              
              // Store in session for future use
              $_SESSION['otp'] = $storedOTP;
          } else {
              error_log("No OTP found in database for phone: " . $phone);
          }
      } catch (Exception $db_error) {
          error_log("Database error while retrieving OTP: " . $db_error->getMessage());
          // Continue with session-only verification if database fails
      }
  }

  // For testing/development - if OTP is 123456, always consider it valid
  if ($otp === "123456") {
      error_log("Using development mode OTP bypass");
      // Create a temporary OTP record
      $storedOTP = [
          'code' => '123456',
          'phone_number' => $phone,
          'created_at' => time(),
          'attempts' => 0
      ];
      $otp_found = true;
      
      // Store in session
      $_SESSION['otp'] = $storedOTP;
  }

  if (!$otp_found) {
      error_log("No OTP found in session or database");
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'No OTP request found. Please request a new OTP']);
      exit();
  }

  error_log("Comparing phones - Input (normalized): " . $phone . ", Stored: " . $storedOTP['phone_number']);

  if ($storedOTP['phone_number'] !== $phone) {
      error_log("Phone number mismatch - Input: " . $phone . ", Stored: " . $storedOTP['phone_number']);
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Phone number does not match OTP request']);
      exit();
  }

  if (time() - $storedOTP['created_at'] > 600) {
      $otp_expired = true;
      error_log("OTP expired - Created: " . $storedOTP['created_at'] . ", Now: " . time());
      
      // Clean up expired OTP
      unset($_SESSION['otp']);
      
      try {
          $conn = db_connect();
          $delete_stmt = $conn->prepare("DELETE FROM otp_codes WHERE phone_number = ? AND otp_code = ?");
          $delete_stmt->bind_param('ss', $storedOTP['phone_number'], $storedOTP['code']);
          $delete_stmt->execute();
      } catch (Exception $e) {
          error_log("Error cleaning up expired OTP: " . $e->getMessage());
      }
      
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'OTP has expired. Please request a new OTP']);
      exit();
  }

  if ($storedOTP['attempts'] >= 3) {
      $too_many_attempts = true;
      error_log("Too many attempts - Count: " . $storedOTP['attempts']);
      
      // Clean up after too many attempts
      unset($_SESSION['otp']);
      
      try {
          $conn = db_connect();
          $delete_stmt = $conn->prepare("DELETE FROM otp_codes WHERE phone_number = ? AND otp_code = ?");
          $delete_stmt->bind_param('ss', $storedOTP['phone_number'], $storedOTP['code']);
          $delete_stmt->execute();
      } catch (Exception $e) {
          error_log("Error cleaning up after too many attempts: " . $e->getMessage());
      }
      
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Too many failed attempts. Please request a new OTP']);
      exit();
  }

  if ($otp !== $storedOTP['code']) {
      error_log("Invalid OTP - Input: " . $otp . ", Stored: " . $storedOTP['code']);
      
      // Increment attempts both in session and database
      $_SESSION['otp']['attempts']++;
      $remainingAttempts = 3 - $_SESSION['otp']['attempts'];
      
      try {
          $conn = db_connect();
          $update_stmt = $conn->prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE phone_number = ? AND otp_code = ?");
          $update_stmt->bind_param('ss', $storedOTP['phone_number'], $storedOTP['code']);
          $update_stmt->execute();
      } catch (Exception $e) {
          error_log("Error updating attempts count: " . $e->getMessage());
      }
      
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => "Invalid OTP. $remainingAttempts attempts remaining"]);
      exit();
  }

  // OTP is valid
  $_SESSION['otp_verified'] = true;
  unset($_SESSION['otp']);
  
  // Clean up verified OTP from database
  try {
      $conn = db_connect();
      $delete_stmt = $conn->prepare("DELETE FROM otp_codes WHERE phone_number = ? AND otp_code = ?");
      $delete_stmt->bind_param('ss', $storedOTP['phone_number'], $storedOTP['code']);
      $delete_stmt->execute();
      error_log("Verified OTP cleaned up from database");
  } catch (Exception $e) {
      error_log("Error cleaning up verified OTP: " . $e->getMessage());
  }
  
  // Ensure session data is written
  session_write_close();

  echo json_encode(['success' => true, 'message' => 'Phone number verified successfully.']);
  ?>
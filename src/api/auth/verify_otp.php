<?php
  session_start();
  require_once __DIR__ . '/../../../vendor/autoload.php';
  require_once __DIR__ . '/../../config/database.php';
  header('Content-Type: application/json');

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['success' => false, 'error' => 'Method not allowed']);
      exit();
  }

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

  if (!isset($_SESSION['otp']) || !is_array($_SESSION['otp'])) {
      error_log("No OTP session found");
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'No OTP request found. Please request a new OTP']);
      exit();
  }

  $storedOTP = $_SESSION['otp'];
  error_log("Comparing phones - Input (normalized): " . $phone . ", Stored: " . $storedOTP['phone_number']);

  if ($storedOTP['phone_number'] !== $phone) {
      error_log("Phone number mismatch - Input: " . $phone . ", Stored: " . $storedOTP['phone_number']);
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Phone number does not match OTP request']);
      exit();
  }

  if (time() - $storedOTP['created_at'] > 600) {
      unset($_SESSION['otp']);
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'OTP has expired. Please request a new OTP']);
      exit();
  }

  if ($storedOTP['attempts'] >= 3) {
      unset($_SESSION['otp']);
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Too many failed attempts. Please request a new OTP']);
      exit();
  }

  if ($otp !== $storedOTP['code']) {
      $_SESSION['otp']['attempts']++;
      $remainingAttempts = 3 - $_SESSION['otp']['attempts'];
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => "Invalid OTP. $remainingAttempts attempts remaining"]);
      exit();
  }

  $_SESSION['otp_verified'] = true;
  unset($_SESSION['otp']);

  echo json_encode(['success' => true, 'message' => 'Phone number verified successfully.']);
  ?>
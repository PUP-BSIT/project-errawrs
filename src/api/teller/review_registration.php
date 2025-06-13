<?php
  session_start();
  require_once __DIR__ . '/../../../vendor/autoload.php'; // Adjusted path
  require_once __DIR__ . '/../../config/database.php';
  use Dotenv\Dotenv;
  use PHPMailer\PHPMailer\PHPMailer;
  use PHPMailer\PHPMailer\Exception;

  header('Content-Type: application/json');

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['success' => false, 'error' => 'Method not allowed']);
      exit();
  }

  if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'teller') {
      http_response_code(403);
      echo json_encode(['success' => false, 'error' => 'Unauthorized']);
      exit();
  }

  $input = json_decode(file_get_contents('php://input'), true);
  if (!isset($input['user_id']) || !isset($input['status']) || !in_array($input['status'], ['approved', 'denied'])) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Invalid input']);
      exit();
  }

  $user_id = $input['user_id'];
  $status = $input['status'];

  try {
      $db = db_connect();
      $db->begin_transaction();

      $userStmt = $db->prepare('SELECT * FROM user WHERE user_id = ? AND is_pending = 1');
      $userStmt->bind_param('i', $user_id);
      $userStmt->execute();
      $result = $userStmt->get_result();
      $user_data = $result->fetch_assoc();

      if (!$user_data) {
          throw new Exception('No pending registration found or already processed');
      }

      if ($status === 'approved') {
          $seqResult = $db->query('SELECT MAX(CAST(SUBSTRING(account_number, 9) AS UNSIGNED)) as last_seq FROM account');
          $seqRow = $seqResult->fetch_assoc();
          $nextSeq = ($seqRow['last_seq'] ?? 0) + 1;
          $year = date('y');
          $accountNumber = sprintf('544%s0%06d', $year, $nextSeq);

          $accountStmt = $db->prepare('INSERT INTO account (user_id, account_number, balance, status) VALUES (?, ?, 0.00, "active")');
          $accountStmt->bind_param('is', $user_id, $accountNumber);
          $accountStmt->execute();
          $account_id = $db->insert_id;

          $updateStmt = $db->prepare('UPDATE user SET is_pending = 0 WHERE user_id = ?');
          $updateStmt->bind_param('i', $user_id);
          $updateStmt->execute();
      } else {
          $updateStmt = $db->prepare('UPDATE user SET is_pending = 0 WHERE user_id = ?');
          $updateStmt->bind_param('i', $user_id);
          $updateStmt->execute();
      }

      $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../')->load(); // Adjusted path

      $mail = new PHPMailer(true);
      $mail->isSMTP();
      $mail->Host = $_ENV['GMAIL_HOST'];
      $mail->SMTPAuth = true;
      $mail->Username = $_ENV['GMAIL_USERNAME'];
      $mail->Password = $_ENV['GMAIL_PASSWORD'];
      $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
      $mail->Port = (int)$_ENV['GMAIL_PORT'];

      $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
      $mail->addAddress($user_data['email']);
      $mail->Subject = "Registration $status";
      $mail->Body = "Hello,\nYour registration (User ID: $user_id) has been $status.\n" . ($status === 'approved' ? "Account Number: $accountNumber" : '');

      $mail->send();

      $db->commit();
      $message = 'Registration ' . $status;
      if ($status === 'approved') {
          $message .= ". Account created with ID: $account_id and number: $accountNumber";
      }
      echo json_encode(['success' => true, 'message' => $message]);
  } catch (Exception $e) {
      if (isset($db)) $db->rollback();
      error_log("Review Error: " . $e->getMessage());
      http_response_code(500);
      echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  } finally {
      if (isset($updateStmt)) $updateStmt->close();
      if (isset($accountStmt)) $accountStmt->close();
      if (isset($userStmt)) $userStmt->close();
      if (isset($db)) db_close($db);
  }
  ?>
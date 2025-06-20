<?php
use Dotenv\Dotenv;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Prevent PHP from displaying errors directly
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set session save path to XAMPP temp directory
$sessionPath = __DIR__ . '/../../../tmp';
if (!is_dir($sessionPath)) {
    mkdir($sessionPath, 0777, true);
}
session_save_path($sessionPath);

// Set session cookie parameters before starting session
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',  // Leave empty for localhost
    'secure' => false,  // Set to true in production
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

// Set JSON content type first, before any output
header('Content-Type: application/json');

try {
    // Debug session info
    error_log("Session ID: " . session_id());
    error_log("Session Data: " . print_r($_SESSION, true));
    error_log("POST Data: " . print_r($_POST, true));
    error_log("FILES Data: " . print_r($_FILES, true));

    require_once __DIR__ . '/../../../vendor/autoload.php';
    require_once __DIR__ . '/../../config/database.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed');
    }

    if (!isset($_SESSION['otp_verified']) || !$_SESSION['otp_verified']) {
        throw new Exception('Phone number not verified');
    }

    // Handle file upload
    if (!isset($_FILES['id_image']) || $_FILES['id_image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('ID image is required');
    }

    // Get other form data
    if (!isset($_POST['data'])) {
        throw new Exception('Form data is required');
    }

    $input = json_decode($_POST['data'], true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid form data format: ' . json_last_error_msg());
    }

    $required_fields = [
        'first_name', 'last_name', 'phone_number', 'date_of_birth',
        'nationality', 'street', 'city', 'zip_code', 'country',
        'email', 'id_type'
    ];

    $missing_fields = [];
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            $missing_fields[] = $field;
        }
    }

    if (!empty($missing_fields)) {
        throw new Exception('Missing required fields: ' . implode(', ', $missing_fields));
    }

    // Create uploads directory if it doesn't exist
    $base_upload_dir = __DIR__ . '/uploads/registration';
    if (!file_exists($base_upload_dir)) {
        if (!mkdir($base_upload_dir, 0777, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }

    $db = db_connect();
    $db->begin_transaction();

    try {
        // Check if phone number already exists in registration_request
        $checkStmt = $db->prepare('SELECT registration_id FROM registration_request WHERE phone_number = ?');
        $checkStmt->bind_param('s', $input['phone_number']);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows > 0) {
            throw new Exception('A registration request with this phone number is already pending. Please wait for approval or contact support.');
        }

        // Check if phone number already exists in user table
        $checkUserStmt = $db->prepare('SELECT user_id FROM user WHERE phone_number = ?');
        $checkUserStmt->bind_param('s', $input['phone_number']);
        $checkUserStmt->execute();
        $userResult = $checkUserStmt->get_result();
        
        if ($userResult->num_rows > 0) {
            throw new Exception('This phone number is already registered. Please login or use a different phone number.');
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
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to insert registration data: ' . $stmt->error);
        }
        
        $registration_id = $db->insert_id;

        // Create directory for this registration
        $upload_dir = $base_upload_dir . '/' . $registration_id;
        if (!file_exists($upload_dir)) {
            if (!mkdir($upload_dir, 0777, true)) {
                throw new Exception('Failed to create registration upload directory');
            }
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
            throw new Exception('Failed to upload file: ' . error_get_last()['message']);
        }

        // Update the registration_request with the correct file path
        $relative_path = 'uploads/registration/' . $registration_id . '/' . $filename;
        $update_stmt = $db->prepare('UPDATE registration_request SET id_image = ? WHERE registration_id = ?');
        $update_stmt->bind_param('si', $relative_path, $registration_id);
        
        if (!$update_stmt->execute()) {
            throw new Exception('Failed to update registration with file path: ' . $update_stmt->error);
        }

        // Load environment variables
        $dotenv = Dotenv::createImmutable(__DIR__ . '/../../../');
        $dotenv->load();

        // Send review email
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $_ENV['GMAIL_HOST'];
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['GMAIL_USERNAME'];
        $mail->Password = $_ENV['GMAIL_PASSWORD'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = (int)$_ENV['GMAIL_PORT'];

        $mail->setFrom($_ENV['GMAIL_FROM_EMAIL'], $_ENV['GMAIL_FROM_NAME']);
        $mail->addAddress($input['email']);
        $mail->Subject = 'Registration Pending - Review';
        $mail->Body = "Hello {$input['first_name']},\n\nYour registration (ID: $registration_id) is pending for review.\n\nYou will be notified when your account is approved.\n\nThank you!";

        $mail->send();

        $db->commit();
        unset($_SESSION['otp_verified']);

        echo json_encode([
            'success' => true,
            'message' => 'Registration submitted. Check your email for review status.',
            'registration_id' => $registration_id
        ]);

    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    } finally {
        if (isset($stmt)) $stmt->close();
        if (isset($update_stmt)) $update_stmt->close();
        $db->close();
    }

} catch (Exception $e) {
    error_log("Registration Request Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}
?>
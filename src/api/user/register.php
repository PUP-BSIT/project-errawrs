<?php
session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// For multipart/form-data (when files are uploaded), data comes in $_POST and $_FILES
// The form fields are sent as a JSON string in the 'data' field
if (!isset($_POST['data'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing data payload']);
    exit();
}

$data = json_decode($_POST['data'], true);

// Validate required fields from the decoded JSON data
if (!isset($data['first_name'], $data['last_name'], $data['username'], $data['password'], $data['phone_number'],
            $data['date_of_birth'], $data['nationality'],
            $data['street'], $data['city'], $data['zip_code'], $data['country'],
            $data['email'], $data['id_type'],
            $data['security_questions']
)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit();
}

// Validate security questions
if (!isset($data['security_questions']['security_q1'],
            $data['security_questions']['security_q2'],
            $data['security_questions']['security_q3'])
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing security questions']);
    exit();
}

// Add a simple check for empty security question values
if (empty(trim($data['security_questions']['security_q1'])) ||
    empty(trim($data['security_questions']['security_q2'])) ||
    empty(trim($data['security_questions']['security_q3']))
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please answer all security questions']);
    exit();
}

// Handle ID image upload
$id_image_path = null;
if (isset($_FILES['id_image']) && $_FILES['id_image']['error'] === UPLOAD_ERR_OK) {
    $target_dir = __DIR__ . "/../../uploads/ids/";
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0777, true);
    }
    $file_extension = pathinfo($_FILES['id_image']['name'], PATHINFO_EXTENSION);
    $unique_filename = uniqid('id_') . '.' . $file_extension;
    $target_file = $target_dir . $unique_filename;

    if (move_uploaded_file($_FILES['id_image']['tmp_name'], $target_file)) {
        $id_image_path = '/uploads/ids/' . $unique_filename;
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to upload ID image']);
        exit();
    }
} else if (!isset($data['id_type']) || empty($data['id_type'])) {
    // If no ID type is selected, or if image upload fails, and ID image is generally required
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID image is required']);
    exit();
}

// Validate field lengths
if (strlen($data['username']) < 3 || strlen($data['username']) > 20) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Username must be between 3 and 20 characters']);
    exit();
}

if (strlen($data['password']) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']);
    exit();
}

if (strlen($data['first_name']) < 2 || strlen($data['last_name']) < 2) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Names must be at least 2 characters']);
    exit();
}

// Phone number validation and conversion
$phone = $data['phone_number'];
$phone = preg_replace('/[^0-9+]/', '', $phone);

// Convert +639 or 639 format to 09
if (preg_match('/^\+?639\d{9}$/', $phone)) {
    $phone = '0' . substr($phone, -10);
}

// Validate phone number format
if (!preg_match('/^09\d{9}$/', $phone)) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => 'Invalid phone number format. Must start with 09 and have 11 digits total'
    ]);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

try {
    $db = db_connect();
    
    // Check if username already exists
    $checkStmt = $db->prepare('SELECT user_id FROM user WHERE username = ?');
    $checkStmt->bind_param('s', $data['username']);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        throw new Exception('Username is already taken');
    }
    
    // Check if phone number already exists
    $checkPhoneStmt = $db->prepare('SELECT user_id FROM user WHERE phone_number = ?');
    $checkPhoneStmt->bind_param('s', $phone);
    $checkPhoneStmt->execute();
    $phoneResult = $checkPhoneStmt->get_result();
    
    if ($phoneResult->num_rows > 0) {
        throw new Exception('Phone number is already registered');
    }

    // Store registration data in session
    $_SESSION['registration'] = [
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'],
        'username' => $data['username'],
        'password' => $data['password'],
        'phone_number' => $phone,
        'id_type' => $data['id_type'], // Store ID type
        'id_image_path' => $id_image_path, // Store ID image path
        'security_questions' => $data['security_questions'], // Store security questions
        'created_at' => time()
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Registration details stored. Please proceed with OTP verification.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 
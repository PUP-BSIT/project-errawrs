<?php

session_start();
header('Content-Type: application/json');

require_once '../../config/db_config.php';
require_once '../otp/send_otp.php';
require_once '../otp/verify_otp.php';

/**
 * Handles user registration and OTP verification.
 * Processes initial registration requests and subsequent OTP verification requests.
 * Returns JSON responses.
 */

$request_data = json_decode(file_get_contents('php://input'), true);

// Check if this is an OTP verification request
if (isset($request_data['otp']) && isset($request_data['phone_number'])) {
    // --- Handle OTP Verification Request ---

    $provided_otp = $request_data['otp'];
    $phone_number_to_verify = $request_data['phone_number'];

    $verify_result = verifyOtp($phone_number_to_verify, $provided_otp);

    if ($verify_result['success'] === true) {
        // OTP is valid, check if we have pending registration
        if (!isset($_SESSION['pending_registration'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'No pending registration found. Please start the registration process again.'
            ]);
            exit();
        }

        $pending_registration_data = $_SESSION['pending_registration'];

        if ($pending_registration_data['phone_number'] !== $phone_number_to_verify) { // Use strict comparison
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Phone number mismatch with pending registration.'
            ]);
            exit();
        }

        $conn = getDBConnection();

        $insert_user_sql = "INSERT INTO user (username, password, email, phone_number, first_name, last_name, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, NOW())";

        $insert_user_stmt = $conn->prepare($insert_user_sql);

        if (!$insert_user_stmt) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error preparing user insert: ' . $conn->error]);
            mysqli_close($conn);
            exit();
        }

        // Bind parameters for user insertion
        $insert_user_stmt->bind_param('ssssss',
            $pending_registration_data['username'],
            $pending_registration_data['password'],
            $pending_registration_data['email'],
            $pending_registration_data['phone_number'],
            $pending_registration_data['first_name'],
            $pending_registration_data['last_name']
        );

        if (!$insert_user_stmt->execute()) {
            // Check for duplicate entry error
            if ($conn->errno == 1062) { // MySQL error code for duplicate entry
                 http_response_code(400);
                 echo json_encode([
                     'success' => false,
                     'error' => 'Username or email already exists.'
                 ]);
            } else {
                 http_response_code(500);
                 echo json_encode([
                     'success' => false,
                     'error' => 'Failed to create user account: ' . $insert_user_stmt->error
                 ]);
            }
            $insert_user_stmt->close();
            mysqli_close($conn);
            exit();
        }

        $new_user_id = $conn->insert_id;
        $insert_user_stmt->close();

        // Clear pending registration data from session
        unset($_SESSION['pending_registration']);

        // Create initial account for the new user
        require_once '../account/create_account.php';
        $account_creation_result = createAccount($new_user_id);

        if ($account_creation_result['success'] === false) {
            error_log("Account creation failed for user ID " . $new_user_id . ": " .
                      $account_creation_result['error']);
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'User created but failed to create initial account: ' . $account_creation_result['error']
            ]);
            mysqli_close($conn);
            exit();
        }

        // Registration and account creation successful
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Registration completed successfully. Please log in to continue.',
            'username' => $pending_registration_data['username'],
            'account_number' => $account_creation_result['account_number']
        ]);

        mysqli_close($conn);
        exit();
    } else {
        // OTP verification failed
        http_response_code(400);
        echo json_encode($verify_result);
        exit();
    }

} else {
    // --- Handle Initial Registration Request ---

    // Validate required fields
    $required_fields = ['username', 'password', 'email', 'phone_number', 'first_name', 'last_name'];
    $missing_fields = [];

    foreach ($required_fields as $field) {
        if (!isset($request_data[$field]) || $request_data[$field] === '') {
            $missing_fields[] = $field;
        }
    }

    if (!empty($missing_fields)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields: ' . implode(', ', $missing_fields)
        ]);
        exit();
    }

    // Assign validated data to descriptive variables
    $username = $request_data['username'];
    $password = $request_data['password'];
    $email = $request_data['email'];
    $phone_number = $request_data['phone_number'];
    $first_name = $request_data['first_name'];
    $last_name = $request_data['last_name'];

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid email format'
        ]);
        exit();
    }

    // Validate phone number format (basic validation - 11 digits)
    if (!preg_match('/^[0-9]{11}$/', $phone_number)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid phone number format. Must be 11 digits.'
        ]);
        exit();
    }

    $conn = getDBConnection();

    // Check if username or email already exists using a single query
    $check_user_sql = "SELECT COUNT(*) AS count FROM user WHERE username = ? OR email = ?";
    $check_user_stmt = $conn->prepare($check_user_sql);

    if (!$check_user_stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error preparing user check: ' . $conn->error]);
        mysqli_close($conn);
        exit();
    }

    $check_user_stmt->bind_param('ss', $username, $email);
    $check_user_stmt->execute();
    $check_user_result = $check_user_stmt->get_result();
    $row = $check_user_result->fetch_assoc();
    $user_exists = $row['count'] > 0;

    $check_user_stmt->close();

    if ($user_exists === true) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Username or email already exists'
        ]);
        mysqli_close($conn);
        exit();
    }

    // Store registration data in session pending OTP verification
    $_SESSION['pending_registration'] = [
        'username' => $username,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'email' => $email,
        'phone_number' => $phone_number,
        'first_name' => $first_name,
        'last_name' => $last_name
    ];

    $send_otp_result = sendOtp($phone_number);

    if ($send_otp_result['success'] === false) {
        // Clear pending registration data if OTP sending fails
        unset($_SESSION['pending_registration']);

        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to send OTP: ' . $send_otp_result['error'],
            'details' => $send_otp_result['details'] ?? null
        ]);
        mysqli_close($conn);
        exit();
    }

    // OTP was sent successfully
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'OTP sent successfully. Please verify your phone number to complete registration.'
    ]);

    mysqli_close($conn);
}

?> 
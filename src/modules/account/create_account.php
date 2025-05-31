<?php

require_once '../../config/db_config.php';

/**
 * Creates a new account for a specified user.
 * Generates a unique account number, inserts the account into the database,
 * and returns the account details.
 *
 * @param int $userId The ID of the user for whom to create the account.
 * @return array An associative array indicating success or failure, with account_number on success.
 */
function createAccount($userId) {
    $conn = getDBConnection();

    // Check if the user exists
    $check_user_sql = "SELECT user_id FROM user WHERE user_id = ?";
    $check_user_stmt = $conn->prepare($check_user_sql);
    if (!$check_user_stmt) {
        error_log("Database error preparing user check in createAccount: " .
                  $conn->error);
        mysqli_close($conn);
        return ['success' => false, 'error' => 'Database error during user check.'];
    }
    $check_user_stmt->bind_param('i', $userId);
    $check_user_stmt->execute();
    $user_result = $check_user_stmt->get_result();

    if ($user_result->num_rows === 0) {
        $check_user_stmt->close();
        mysqli_close($conn);
        return ['success' => false, 'error' => 'User with provided ID not found.'];
    }
    $check_user_stmt->close();

    // --- Generate Unique Account Number ---
    // Format: Bank Code (3 digits) + Year (2 digits) + Reserved (1 digit) + Sequential (6 digits)
    $bank_code = '544';
    $year = date('y'); // Current year (last 2 digits)
    $reserved = '0'; // Reserved digit
    $prefix = $bank_code . $year . $reserved;
    $sequential_length = 6;

    // Find the maximum sequential number for the current prefix
    $get_max_seq_sql = "SELECT MAX(CAST(SUBSTRING(account_number, LENGTH(?) + 1) AS UNSIGNED)) AS max_seq
                          FROM account
                         WHERE account_number LIKE ?";

    $get_max_seq_stmt = $conn->prepare($get_max_seq_sql);

    if (!$get_max_seq_stmt) {
        error_log("Database error preparing get max seq in createAccount: " .
                  $conn->error);
        mysqli_close($conn);
        return ['success' => false,
                'error' => 'Database error during account number generation.'];
    }

    $like_pattern = $prefix . '%';
    $get_max_seq_stmt->bind_param('ss', $prefix, $like_pattern);
    $get_max_seq_stmt->execute();
    $max_seq_result = $get_max_seq_stmt->get_result();
    $max_seq_row = $max_seq_result->fetch_assoc();
    $last_sequential_number = $max_seq_row['max_seq'] ? (int)$max_seq_row['max_seq'] : 0;

    $next_sequential_number = $last_sequential_number + 1;

    $formatted_sequential = str_pad($next_sequential_number, $sequential_length,
                                    '0', STR_PAD_LEFT);

    $new_account_number = $prefix . $formatted_sequential;

    // TODO: Add a check here to ensure the generated account number is truly unique.
    // While querying max helps, in high-concurrency scenarios, a duplicate might be generated.
    // A loop with retries and a check for duplicate key error on insert is a more robust approach.

    $initial_balance = 0.00;

    // Insert new account into the database
    $insert_account_sql = "INSERT INTO account (user_id, account_number, balance,
                                  created_at)
                           VALUES (?, ?, ?, NOW())";
    $insert_account_stmt = $conn->prepare($insert_account_sql);

    if (!$insert_account_stmt) {
        error_log("Database error preparing account insert in createAccount: " .
                  $conn->error);
        mysqli_close($conn);
        return ['success' => false, 'error' => 'Database error during account creation.'];
    }

    $insert_account_stmt->bind_param('isd', $userId,
                                        $new_account_number,
                                        $initial_balance);

    if (!$insert_account_stmt->execute()) {
        if ($conn->errno == 1062) {
            error_log("Duplicate account number generated on insert: " .
                       $new_account_number);
            mysqli_close($conn);
            return ['success' => false,
                    'error' => 'Failed to create unique account number. Please try again.'];
        } else {
            error_log("Database error executing account insert in createAccount for user " .
                       $userId . ": " . $insert_account_stmt->error);
            mysqli_close($conn);
            return ['success' => false,
                    'error' => 'Failed to create account due to database error.'];
        }
    }

    $insert_account_stmt->close();
    mysqli_close($conn);

    return [
        'success' => true,
        'message' => 'Account created successfully.',
        'account_number' => $new_account_number
    ];
}

/**
 * Handles direct API calls for creating a new account.
 * Expects JSON payload with 'user_id'. Returns JSON response.
 * Note: In a typical application, account creation would be triggered
 *       through a user registration or logged-in user request flow,
 *       not a direct API call to this script with just a user_id.
 *       This block is included for potential direct testing or specific use cases.
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $request_data = json_decode(file_get_contents('php://input'), true);

    if (!isset($request_data['user_id']) || !is_numeric($request_data['user_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing or invalid user_id in request body.'
        ]);
        exit();
    }

    $userIdFromRequest = (int)$request_data['user_id'];

    $creation_result = createAccount($userIdFromRequest);

    if ($creation_result['success'] === true) {
        http_response_code(200);
    } else {
        http_response_code(500);
    }
    echo json_encode($creation_result);
    exit();
}

?> 
<?php

session_start();

/**
 * Verifies a provided OTP against the one stored in the session.
 *
 * @param string $phoneNumber The phone number associated with the OTP.
 * @param string $providedOtp The OTP provided by the user.
 * @return array An associative array indicating success or failure with an error message if applicable.
 */
function verifyOtp($phoneNumber, $providedOtp) {
    if (empty(trim($phoneNumber))) {
        return ['success' => false, 'error' => 'Phone number is required for verification.'];
    }
    if (empty(trim($providedOtp))) {
         return ['success' => false, 'error' => 'OTP is required for verification.'];
    }

    $session_key = 'otp_' . $phoneNumber;

    if (!isset($_SESSION[$session_key])) {
        return ['success' => false, 'error' => 'No OTP found for this phone number.'];
    }

    $otp_data = $_SESSION[$session_key];
    $stored_otp_code = $otp_data['code'];
    $stored_otp_expiry = $otp_data['expiry'];

    if (time() > $stored_otp_expiry) {
        // Clear expired OTP from session
        unset($_SESSION[$session_key]);
        return ['success' => false, 'error' => 'OTP has expired.'];
    }

    if ($providedOtp === $stored_otp_code) { // Use strict comparison
        unset($_SESSION[$session_key]);
        return ['success' => true, 'message' => 'OTP verified successfully.'];
    } else {
        return ['success' => false, 'error' => 'Invalid OTP.'];
    }
}

/**
 * Handles direct API calls for OTP verification (for backward compatibility or direct use).
 * Expects JSON payload with 'phone_number' and 'otp'. Returns JSON response.
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $request_data = json_decode(file_get_contents('php://input'), true);

    if (isset($request_data['phone_number']) && isset($request_data['otp'])) {
        $phone_number_from_request = $request_data['phone_number'];
        $otp_from_request = $request_data['otp'];

        $verify_result = verifyOtp($phone_number_from_request, $otp_from_request);

        if ($verify_result['success'] === true) {
            http_response_code(200);
        } else {
            http_response_code(400);
        }
        echo json_encode($verify_result);
        exit();
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required fields: phone_number and/or otp.'
        ]);
        exit();
    }
}

?>
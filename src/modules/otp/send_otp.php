<?php

session_start();

// Assuming Semaphore API details are in config or environment variables
// require_once '../../config/api_config.php'; // Example for API key/URL

/**
 * Generates a random One-Time Password (OTP).
 *
 * @param int $length The length of the OTP to generate. Defaults to 6.
 * @return string The generated OTP.
 */
function generateOtp($length = 6) {
    $characters = '0123456789';
    $otp = '';
    $character_count = strlen($characters);
    for ($i = 0; $i < $length; $i++) {
        $otp .= $characters[rand(0, $character_count - 1)];
    }
    return $otp;
}

/**
 * Sends an OTP to a specified phone number using the Semaphore API.
 * Stores the OTP and its expiry time in the session.
 *
 * @param string $phoneNumber The phone number to send the OTP to.
 * @return array An associative array indicating success or failure.
 */
function sendOtp($phoneNumber) {
    // Validate phone number format (basic validation - 11 digits)
    if (!preg_match('/^[0-9]{11}$/', $phoneNumber)) {
        return [
            'success' => false,
            'error' => 'Invalid phone number format. Must be 11 digits.'
        ];
    }

    $otp = generateOtp(); // Generate a 6-digit OTP
    $expiry_time = time() + (3 * 60); // OTP valid for 5 minutes

    // Store OTP and expiry in session linked to the phone number
    $_SESSION['otp_' . $phoneNumber] = [
        'code' => $otp,
        'expiry' => $expiry_time
    ];

    // --- Semaphore API Call ---
    // TODO: Implement the actual API call to Semaphore to send the SMS.
    $semaphore_api_key = 'SEMAPHORE_API_KEY';
    $semaphore_sender_id = 'SEMAPHORE_SENDER_ID';
    $semaphore_api_url = 'https://semaphore.co/api/v4/messages';

    $message_text = "Your OTP is: " . $otp . ". It is valid for 5 minutes.";

    $curl = curl_init();

    curl_setopt_array($curl, array(
      CURLOPT_URL => $semaphore_api_url,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_ENCODING => '',
      CURLOPT_MAXREDIRS => 10,
      CURLOPT_TIMEOUT => 0,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
      CURLOPT_CUSTOMREQUEST => 'POST',
      CURLOPT_POSTFIELDS => array(
          'apikey' => $semaphore_api_key,
          'number' => $phoneNumber,
          'message' => $message_text,
          'sendername' => $semaphore_sender_id
      ),
      CURLOPT_HTTPHEADER => array(
        'Accept: application/json',
      ),
    ));

    $response = curl_exec($curl);
    $http_status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $err = curl_error($curl);

    curl_close($curl);

    if ($err) {
        // TODO: Log the cURL error.
        return [
            'success' => false,
            'error' => 'cURL Error #' . $err,
            'details' => null
        ];
    } else {
        $response_data = json_decode($response, true);

        // TODO: Check the actual response from Semaphore API to confirm success.
        // Semaphore API usually returns an array of message statuses.
        if ($http_status === 200 && !empty($response_data)) {
             // Assuming the API returns a non-empty array on success
            return [
                'success' => true,
                'message' => 'OTP sent successfully.'
            ];
        } else {
            // TODO: Log the Semaphore API error response for debugging.
            return [
                'success' => false,
                'error' => 'Semaphore API error or unexpected response.',
                'details' => $response_data ?? $response
            ];
        }
    }
}

// Direct API call handling (for backward compatibility or direct use)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $request_data = json_decode(file_get_contents('php://input'), true);

    // Check if phone_number is provided in the request payload
    if (isset($request_data['phone_number'])) {
        $phone_number_from_request = $request_data['phone_number'];
        $send_result = sendOtp($phone_number_from_request);

        header('Content-Type: application/json');
        if ($send_result['success'] === true) {
            http_response_code(200);
        } else {
            http_response_code(500);
        }
        echo json_encode($send_result);
        exit();
    }
}

?>
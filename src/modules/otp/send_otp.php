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
 * Sends an OTP to a specified phone number (simulated for demo).
 * Stores the OTP and its expiry time in the session.
 *
 * @param string $phoneNumber The phone number associated with the OTP.
 * @return array An associative array indicating simulated success or failure.
 */
function sendOtp($phoneNumber) {
    // Validate phone number format (11 digits starting with 0, or 12 digits starting with 63)
    if (!preg_match('/^(09|639)[0-9]{9}$/', $phoneNumber)) {
        return [
            'success' => false,
            'error' => 'Invalid phone number format. Must be 11 digits (09xxxxxxxxx) or 12 digits (639xxxxxxxxx).'
        ];
    }

    // --- Demo Mode: Use predefined OTP instead of generating ---
    $otp = '123456'; // Predefined OTP for demo purposes
    $expiry_time = time() + (5 * 60); // OTP valid for 5 minutes

    // Store OTP and expiry in session linked to the phone number
    $_SESSION['otp_' . $phoneNumber] = [
        'code' => $otp,
        'expiry' => $expiry_time
    ];

    // --- Semaphore API Call (Commented out for Demo) ---
    /*
    // Read environment variables directly from the .env file
    $envFilePath = __DIR__ . '/../../.env'; // Adjust path to your project root
    $envVars = [];

    if (file_exists($envFilePath)) {
        $lines = file($envFilePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            // Skip comments
            if (str_starts_with(trim($line), '#')) {
                continue;
            }

            // Split the line at the first equals sign
            $parts = explode('=', $line, 2);

            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $value = trim($parts[1]);

                // Remove quotes from value if present
                if (str_starts_with($value, '"') && str_ends_with($value, '"')) {
                    $value = substr($value, 1, -1);
                } elseif (str_starts_with($value, '\'') && str_ends_with($value, '\'')) {
                     $value = substr($value, 1, -1);
                }

                $envVars[$key] = $value;
            }
        }
    }

    // Retrieve API key, sender ID, and API URL from the loaded environment variables
    $semaphore_api_key = $envVars['SEMAPHORE_API_KEY'] ?? null;
    $semaphore_sender_id = $envVars['SEMAPHORE_SENDER_ID'] ?? null;
    $semaphore_api_url = $envVars['SEMAPHORE_API_URL'] ?? null;

    // Check if required environment variables are set
    if (!$semaphore_api_key || !$semaphore_sender_id || !$semaphore_api_url) {
        $missing = [];
        if (!$semaphore_api_key) $missing[] = 'SEMAPHORE_API_KEY';
        if (!$semaphore_sender_id) $missing[] = 'SEMAPHORE_SENDER_ID';
        if (!$semaphore_api_url) $missing[] = 'SEMAPHORE_API_URL';

        error_log("Missing Semaphore environment variables: " . implode(', ', $missing));
        return [
            'success' => false,
            'error' => 'Semaphore API configuration missing.',
            'details' => 'Missing environment variables: ' . implode(', ', $missing)
        ];
    }

    // Use the {otp} placeholder as specified by the API documentation
    $message_text = "Your One Time Password is: {otp}. Please use it within 5 minutes.";

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
          'sendername' => $semaphore_sender_id,
          'code' => $otp // Pass our generated code for the API to use
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
        error_log("Semaphore cURL Error for phone number " . $phoneNumber . ": " . $err);
        return [
            'success' => false,
            'error' => 'cURL Error #' . $err,
            'details' => null
        ];
    } else {
        $response_data = json_decode($response, true);

        if ($http_status === 200 && !empty($response_data) && isset($response_data[0]['status'])) {
            return [
                'success' => true,
                'message' => 'OTP sent successfully.'
            ];
        } else {
            error_log("Semaphore API Error Response for phone number " . $phoneNumber . ": " . print_r($response_data, true));
            return [
                'success' => false,
                'error' => 'Semaphore API error or unexpected response.',
                'details' => $response_data ?? $response
            ];
        }
    }
    */

    // --- End Demo Mode ---

    // Simulate a successful API call response for demo
    return [
        'success' => true,
        'message' => 'OTP sent successfully (Simulated).',
        'simulated_otp' => $otp
    ];
}

// Direct API call handling (for backward compatibility or direct use)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $request_data = json_decode(file_get_contents('php://input'), true);

    if (isset($request_data['phone_number'])) {
        $phone_number_from_request = $request_data['phone_number'];
        $send_result = sendOtp($phone_number_from_request);

        if ($send_result['success'] === true) {
            http_response_code(200);
        } else {
            http_response_code(500);
        }
        echo json_encode($send_result);
        exit();
    } else {
         http_response_code(400);
         echo json_encode([
             'success' => false,
             'error' => 'Missing required field: phone_number.'
         ]);
         exit();
    }
}

?>
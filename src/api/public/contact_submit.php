<?php
header('Content-Type: application/json');

// Allow CORS if needed (uncomment if serving from different domain)
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST');
// header('Access-Control-Allow-Headers: Content-Type');

// Bank's email address
$bank_email = 'stackovercash.bank@gmail.com';

// Helper function to sanitize input
define('REQUIRED_FIELDS', ['name', 'email', 'subject', 'message']);

function sanitize($str) {
    return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
}

// Validate POST data
foreach (REQUIRED_FIELDS as $field) {
    if (empty($_POST[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required field: ' . $field]);
        exit;
    }
}

$name = sanitize($_POST['name']);
$email = sanitize($_POST['email']);
$subject = sanitize($_POST['subject']);
$message = sanitize($_POST['message']);

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}

// Compose email
$email_subject = "[Contact Us] $subject";
$email_body = "You have received a new message from the contact form on StackOvercash.\n\n" .
              "Name: $name\n" .
              "Email: $email\n" .
              "Subject: $subject\n" .
              "Message:\n$message\n";
$headers = "From: $name <$email>\r\n" .
           "Reply-To: $email\r\n" .
           "Content-Type: text/plain; charset=UTF-8\r\n";

// Send email
if (mail($bank_email, $email_subject, $email_body, $headers)) {
    echo json_encode(['success' => true, 'message' => 'Message sent successfully.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to send message. Please try again later.']);
} 
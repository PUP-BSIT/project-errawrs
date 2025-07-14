<?php
/**
 * Test Email Templates
 * Access this file in your browser to preview email templates
 */

// Include the email template functions
require_once __DIR__ . '/../src/api/admin/email-templates/teller-reset-password-email.php';
require_once __DIR__ . '/../src/api/admin/email-templates/teller-account-setup-email.php';

// Get the template type from URL parameter
$template = $_GET['template'] ?? 'reset';

// Sample data for testing
$sampleData = [
    'firstName' => 'John',
    'lastName' => 'Doe',
    'email' => 'john.doe@example.com',
    'tellerNumber' => 'T000123',
    'resetLink' => 'http://stackovercash.site/teller/reset_password.html?token=sample_token_123',
    'setPasswordLink' => 'http://stackovercash.site/teller/set_password.html?teller_email=john.doe@example.com'
];

// Generate the appropriate template
if ($template === 'setup') {
    $html = getTellerAccountSetupEmailTemplate(
        $sampleData['firstName'],
        $sampleData['lastName'],
        $sampleData['tellerNumber'],
        $sampleData['setPasswordLink']
    );
    $title = 'Teller Account Setup Email';
} else {
    $html = getTellerResetPasswordEmailTemplate(
        $sampleData['firstName'],
        $sampleData['lastName'],
        $sampleData['email'],
        $sampleData['resetLink']
    );
    $title = 'Teller Password Reset Email';
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $title; ?> - Preview</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: #333;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .nav {
            margin-bottom: 20px;
        }
        .nav a {
            display: inline-block;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-right: 10px;
        }
        .nav a:hover {
            background: #0056b3;
        }
        .nav a.active {
            background: #28a745;
        }
        .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .email-preview {
            border: 2px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }
        .info {
            background: #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><?php echo $title; ?> - Preview</h1>
            <p>This is how the email will look when sent to users.</p>
        </div>

        <div class="nav">
            <a href="?template=reset" class="<?php echo $template === 'reset' ? 'active' : ''; ?>">
                Password Reset Email
            </a>
            <a href="?template=setup" class="<?php echo $template === 'setup' ? 'active' : ''; ?>">
                Account Setup Email
            </a>
        </div>

        <div class="info">
            <h3>Sample Data Used:</h3>
            <ul>
                <li><strong>Name:</strong> <?php echo $sampleData['firstName'] . ' ' . $sampleData['lastName']; ?></li>
                <li><strong>Email:</strong> <?php echo $sampleData['email']; ?></li>
                <?php if ($template === 'setup'): ?>
                    <li><strong>Teller Number:</strong> <?php echo $sampleData['tellerNumber']; ?></li>
                <?php endif; ?>
                <li><strong>Link:</strong> <?php echo $template === 'setup' ? $sampleData['setPasswordLink'] : $sampleData['resetLink']; ?></li>
            </ul>
        </div>

        <div class="preview-container">
            <h3>Email Preview:</h3>
            <div class="email-preview">
                <?php echo $html; ?>
            </div>
        </div>
    </div>
</body>
</html> 
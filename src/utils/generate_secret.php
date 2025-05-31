<?php
function generateSecureSecret($length = 64) {
    return bin2hex(random_bytes($length));
}

$envFile = __DIR__ . '/../.env';
$secret = generateSecureSecret();

if (!file_exists($envFile)) {
    file_put_contents($envFile, "JWT_SECRET=" . $secret . "\n");
    echo "Created .env file with new JWT_SECRET\n";
} else {
    $content = file_get_contents($envFile);
    if (strpos($content, 'JWT_SECRET=') !== false) {
        $content = preg_replace('/JWT_SECRET=.*/', 'JWT_SECRET=' . $secret, $content);
    } else {
        $content .= "\nJWT_SECRET=" . $secret;
    }
    file_put_contents($envFile, $content);
    echo "Updated JWT_SECRET in .env file\n";
}

echo "\nGenerated JWT_SECRET: " . $secret . "\n";
echo "Please keep this secret secure and don't share it.\n"; 
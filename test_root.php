<?php
/**
 * Test Root URL Content
 */

$url = 'http://localhost/project-errawrs/';

echo "Testing root URL: $url\n\n";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => false,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_FOLLOWLOCATION => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response length: " . strlen($response) . " characters\n";
echo "First 500 characters:\n";
echo substr($response, 0, 500) . "\n"; 
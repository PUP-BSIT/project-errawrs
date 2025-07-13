<?php
/**
 * Test API through public directory
 */

$urls = [
    'http://localhost/project-errawrs/public/',
    'http://localhost/project-errawrs/public/index.php',
    'http://localhost/project-errawrs/public/index.php/api/auth/login'
];

foreach ($urls as $url) {
    echo "Testing: $url\n";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_NOBODY => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo "  ❌ Error: $error\n";
    } else {
        echo "  ✅ HTTP Code: $httpCode\n";
    }
    echo "\n";
} 
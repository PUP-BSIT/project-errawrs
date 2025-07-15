<?php
/**
 * Web Routes for ERRAWRS Banking System
 * 
 * This file defines all web routes for the banking application frontend.
 * Routes are organized by user type and functionality.
 */

$host = $_SERVER['HTTP_HOST'] ?? '';
if (strpos($host, 'teller.') === 0 || strpos($host, 'dev-teller.') === 0) {
    // Teller subdomain routes
    $router->get('/', 'public/teller/bank_teller_login.html');
    $router->get('/login', 'public/teller/bank_teller_login.html');
    $router->get('/dashboard', 'public/teller/bank_teller_dashboard.html');
    $router->get('/search', 'public/teller/bank_teller_search_account.html');
    $router->get('/deposit', 'public/teller/bank_teller_deposit.html');
    $router->get('/withdraw', 'public/teller/bank_teller_withdraw.html');
    $router->get('/history', 'public/teller/bank_teller_history.html');
    $router->get('/profile', 'public/teller/bank_teller_view_profile.html');
    $router->get('/registrations', 'public/teller/bank_teller_review_registration.html');
    $router->get('/set-password', 'public/teller/set_password.html');
    $router->get('/reset-password', 'public/teller/reset_password.html');
    
    // Favicon for teller subdomain
    $router->get('/favicon.ico', function() {
        $path = "public/assets/images/favicon.ico";
        if (file_exists($path)) {
            header('Content-Type: image/x-icon');
            readfile($path);
        } else {
            http_response_code(404);
        }
    });
    
    // Asset and error routes remain the same
    return $router;
}
if (strpos($host, 'admin.') === 0 || strpos($host, 'dev-admin.') === 0) {
    // Admin subdomain routes
    $router->get('/', 'public/admin/login.html');
    $router->get('/login', 'public/admin/login.html');
    $router->get('/dashboard', 'public/admin/dashboard.html');
    $router->get('/users', 'public/admin/user_accounts.html');
    $router->get('/tellers', 'public/admin/manage_tellers.html');
    $router->get('/transactions', 'public/admin/transactions.html');
    
    // API routes for admin subdomain (same as main domain)
    $router->get('/api/auth/admin-session-check', 'src/api/auth/admin_session_check.php');
    $router->get('/api/admin/info', 'src/api/admin/info.php');
    $router->get('/api/admin/dashboard', 'src/api/admin/dashboard_stats.php');
    $router->get('/api/admin/tellers', 'src/api/admin/list_tellers.php');
    $router->post('/api/admin/tellers', 'src/api/admin/create_teller.php');
    $router->get('/api/admin/tellers/{id}', 'src/api/admin/get_teller.php');
    $router->put('/api/admin/tellers/{id}', 'src/api/admin/update.php');
    $router->post('/api/admin/tellers/{id}/toggle-status', 'src/api/admin/toggle_teller_status.php');
    $router->post('/api/admin/tellers/{id}/reset-password', 'src/api/admin/send_teller_reset_email.php');
    $router->get('/api/admin/users', 'src/api/admin/list_users.php');
    $router->get('/api/admin/users/{id}', 'src/api/admin/get_user.php');
    $router->get('/api/admin/transactions', 'src/api/admin/get_transactions.php');
    $router->post('/api/auth/login', 'src/api/auth/login.php');
    $router->post('/api/auth/logout', 'src/api/auth/logout.php');
    
    // API config file
    $router->get('/api_config.js', 'public/api_config.js');
    
    // CSS files for admin subdomain
    $router->get('/css/{file}', function($file) {
        $path = "public/admin/css/{$file}";
        if (file_exists($path)) {
            header('Content-Type: text/css');
            readfile($path);
        } else {
            http_response_code(404);
            echo "CSS file not found";
        }
    });
    
    // JavaScript files for admin subdomain
    $router->get('/js/{file}', function($file) {
        $path = "public/admin/js/{$file}";
        if (file_exists($path)) {
            header('Content-Type: application/javascript');
            readfile($path);
        } else {
            http_response_code(404);
            echo "JavaScript file not found";
        }
    });
    
    // Image files for admin subdomain
    $router->get('/images/{file}', function($file) {
        $path = "public/assets/images/{$file}";
        if (file_exists($path)) {
            $extension = pathinfo($file, PATHINFO_EXTENSION);
            $mimeTypes = [
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'ico' => 'image/x-icon'
            ];
            
            if (isset($mimeTypes[$extension])) {
                header("Content-Type: {$mimeTypes[$extension]}");
                readfile($path);
            } else {
                http_response_code(404);
                echo "Image file not found";
            }
        } else {
            http_response_code(404);
            echo "Image file not found";
        }
    });
    
    // Assets images for admin subdomain
    $router->get('/assets/images/{file}', function($file) {
        $path = "public/assets/images/{$file}";
        if (file_exists($path)) {
            $extension = pathinfo($file, PATHINFO_EXTENSION);
            $mimeTypes = [
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'ico' => 'image/x-icon'
            ];
            if (isset($mimeTypes[$extension])) {
                header("Content-Type: {$mimeTypes[$extension]}");
                readfile($path);
            } else {
                http_response_code(404);
                echo "Image file not found";
            }
        } else {
            http_response_code(404);
            echo "Image file not found";
        }
    });
    
    // Favicon for admin subdomain
    $router->get('/favicon.ico', function() {
        $path = "public/assets/images/favicon.ico";
        if (file_exists($path)) {
            header('Content-Type: image/x-icon');
            readfile($path);
        } else {
            http_response_code(404);
        }
    });
    
    return $router;
}

// =====================================================
// PUBLIC ROUTES (No Authentication Required)
// =====================================================

// Landing page and public pages
$router->get('/', 'public/user/index.html');
$router->get('/home', 'public/user/index.html');
$router->get('/landing', 'public/user/index.html');

// About and information pages
$router->get('/about-us', 'public/user/about.html');
$router->get('/contact-us', 'public/user/contact_us.html');
$router->get('/privacy-policy', 'public/user/privacy_policy.html');

// =====================================================
// AUTHENTICATION ROUTES
// =====================================================

// Login pages
$router->get('/login', 'public/user/login_account_holder.html');

// Registration pages
$router->get('/register', 'public/user/registration.html');
$router->get('/registration', 'public/user/registration.html');

// Password management pages
$router->get('/forgot-password', 'public/user/forgot_password.html');
$router->get('/forgot-username', 'public/user/forgot_username.html');
$router->get('/reset-password', 'public/user/reset_password.html');

// =====================================================
// USER ROUTES (Account Holders)
// =====================================================

// User dashboard and main pages
$router->get('/user/dashboard', 'public/user/user_dashboard.html');
$router->get('/user/account', 'public/user/account.html');
$router->get('/user/profile', 'public/user/profile.html');
$router->get('/user/transactions', 'public/user/transaction.html');

// Transfer pages
$router->get('/user/transfer', 'public/user/transfer.html');
$router->get('/user/transfer/success', 'public/user/transfer_success.html');
$router->get('/user/transfer/failed', 'public/user/transfer_failed.html');
$router->get('/user/transfer_success', 'public/user/transfer_success.html');


// =====================================================
// ADMIN ROUTES
// =====================================================

// Admin dashboard and main pages
$router->get('/admin/dashboard', 'public/admin/dashboard.html');
$router->get('/admin/users', 'public/admin/user_accounts.html');
$router->get('/admin/tellers', 'public/admin/manage_tellers.html');
$router->get('/admin/transactions', 'public/admin/transactions.html');

// =====================================================
// ASSET ROUTES
// =====================================================

// CSS files
$router->get('/css/{file}', function($file) {
    $paths = [
        "public/user/css/{$file}",
        "public/teller/css/{$file}",
        "public/admin/css/{$file}"
    ];
    foreach ($paths as $path) {
        if (file_exists($path)) {
            header('Content-Type: text/css');
            readfile($path);
            return;
        }
    }
    http_response_code(404);
    echo "CSS file not found";
});

// JavaScript files
$router->get('/js/{file}', function($file) {
    $paths = [
        "public/user/js/{$file}",
        "public/teller/js/{$file}",
        "public/admin/js/{$file}"
    ];
    foreach ($paths as $path) {
        if (file_exists($path)) {
            header('Content-Type: application/javascript');
            readfile($path);
            return;
        }
    }
    http_response_code(404);
    echo "JavaScript file not found";
});

// Image files
$router->get('/images/{file}', function($file) {
    $path = "public/assets/images/{$file}";
    if (file_exists($path)) {
        $extension = pathinfo($file, PATHINFO_EXTENSION);
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon'
        ];
        
        if (isset($mimeTypes[$extension])) {
            header("Content-Type: {$mimeTypes[$extension]}");
            readfile($path);
        } else {
            http_response_code(404);
            echo "Image file not found";
        }
    } else {
        http_response_code(404);
        echo "Image file not found";
    }
});

// Favicon
$router->get('/favicon.ico', function() {
    $path = "public/assets/images/favicon.ico";
    if (file_exists($path)) {
        header('Content-Type: image/x-icon');
        readfile($path);
    } else {
        http_response_code(404);
    }
});

// Serve images for /assets/images/{file} as well
$router->get('/assets/images/{file}', function($file) {
    $path = "public/assets/images/{$file}";
    if (file_exists($path)) {
        $extension = pathinfo($file, PATHINFO_EXTENSION);
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon'
        ];
        if (isset($mimeTypes[$extension])) {
            header("Content-Type: {$mimeTypes[$extension]}");
            readfile($path);
        } else {
            http_response_code(404);
            echo "Image file not found";
        }
    } else {
        http_response_code(404);
        echo "Image file not found";
    }
});

// Serve the test email templates preview file
$router->get('/test_email_templates.php', function() {
    require __DIR__ . '/../public/test_email_templates.php';
    exit;
});
$router->get('/test-email-templates', function() {
    require __DIR__ . '/../public/test_email_templates.php';
    exit;
});

// =====================================================
// ROUTE GROUPS (for middleware)
// =====================================================

// Routes that require authentication
$router->group(['middleware' => 'auth'], function($router) {
    // User authenticated routes
    $router->group(['prefix' => 'user', 'middleware' => 'user'], function($router) {
        $router->get('/dashboard', 'public/user/user_dashboard.html');
        $router->get('/account', 'public/user/account.html');
        $router->get('/profile', 'public/user/profile.html');
        $router->get('/transactions', 'public/user/transaction.html');
        $router->get('/transfer', 'public/user/transfer.html');
    });
    
    // Teller authenticated routes
    $router->group(['prefix' => 'teller', 'middleware' => 'teller'], function($router) {
        $router->get('/dashboard', 'public/teller/bank_teller_dashboard.html');
        $router->get('/search', 'public/teller/bank_teller_search_account.html');
        $router->get('/deposit', 'public/teller/bank_teller_deposit.html');
        $router->get('/withdraw', 'public/teller/bank_teller_withdraw.html');
        $router->get('/history', 'public/teller/bank_teller_history.html');
        $router->get('/profile', 'public/teller/bank_teller_view_profile.html');
        $router->get('/registrations', 'public/teller/bank_teller_review_registration.html');
    });
    
    // Admin authenticated routes
    $router->group(['prefix' => 'admin', 'middleware' => 'admin'], function($router) {
        $router->get('/dashboard', 'public/admin/dashboard.html');
        $router->get('/users', 'public/admin/user_accounts.html');
        $router->get('/tellers', 'public/admin/manage_tellers.html');
        $router->get('/transactions', 'public/admin/transactions.html');
    });
});

// =====================================================
// ERROR PAGES
// =====================================================

// 404 Not Found
$router->notFound(function() {
    http_response_code(404);
    echo '<!DOCTYPE html>
    <html>
    <head>
        <title>404 - Page Not Found</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
            .error-code { font-size: 72px; color: #95a5a6; }
        </style>
    </head>
    <body>
        <div class="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <a href="/">Go to Homepage</a>
    </body>
    </html>';
});

// 403 Forbidden
$router->forbidden(function() {
    http_response_code(403);
    echo '<!DOCTYPE html>
    <html>
    <head>
        <title>403 - Access Forbidden</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
            .error-code { font-size: 72px; color: #95a5a6; }
        </style>
    </head>
    <body>
        <div class="error-code">403</div>
        <h1>Access Forbidden</h1>
        <p>You do not have permission to access this page.</p>
        <a href="/">Go to Homepage</a>
    </body>
    </html>';
});

// 500 Internal Server Error
// $router->serverError(function() {
//     http_response_code(500);
//     echo '<!DOCTYPE html>
//     <html>
//     <head>
//         <title>500 - Internal Server Error</title>
//         <style>
//             body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
//             h1 { color: #e74c3c; }
//             .error-code { font-size: 72px; color: #95a5a6; }
//         </style>
//     </head>
//     <body>
//         <div class="error-code">500</div>
//         <h1>Internal Server Error</h1>
//         <p>Something went wrong on our end. Please try again later.</p>
//         <a href="/">Go to Homepage</a>
//     </body>
//     </html>';
// });

return $router; 
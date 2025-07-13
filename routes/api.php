<?php
/**
 * API Routes for ERRAWRS Banking System
 * 
 * This file defines all API routes for the banking application.
 * Routes are organized by functionality and user type.
 */

$router = new Router();

// =====================================================
// AUTHENTICATION ROUTES
// =====================================================

// Login routes
$router->post('/auth/login', 'src/api/auth/login.php');

// Logout routes
$router->post('/auth/logout', 'src/api/auth/logout.php');

// Session management
$router->get('/auth/session-check', 'src/api/auth/session_check.php');
$router->post('/auth/kill-session', 'src/api/auth/kill_session.php');

// OTP verification
$router->post('/auth/send-otp', 'src/api/auth/send_otp.php');
$router->post('/auth/verify-otp', 'src/api/auth/verify_otp.php');

// Password management
$router->post('/auth/request-password-reset', 'src/api/user/request_password_reset.php');
$router->post('/auth/reset-password', 'src/api/user/reset_password.php');
$router->post('/auth/verify-reset-token', 'src/api/user/verify_reset_token.php');
$router->post('/auth/forgot-username', 'src/api/user/forgot_username.php');

// =====================================================
// USER ROUTES (Account Holders)
// =====================================================

// User registration
$router->post('/user/register', 'src/api/user/submit_registration.php');

// User profile management
$router->get('/user/profile', 'src/api/user/update_profile.php');
$router->put('/user/profile', 'src/api/user/update_profile.php');

// Account management
$router->get('/user/accounts', 'src/api/user/accounts.php');
$router->post('/user/accounts/create', 'src/api/user/create_additional_account.php');

// Transaction management
$router->get('/user/transactions', 'src/api/user/transactions.php');
$router->post('/user/transactions/transfer', 'src/api/user/fund_transfer.php');
$router->post('/user/transactions/external-transfer', 'src/api/user/external_transfer.php');
$router->post('/user/transactions/cancel', 'src/api/user/cancel_transfer.php');
$router->get('/user/transactions/success', 'src/api/user/transfer_success.php');

// Financial tips
$router->get('/user/financial-tips', 'src/api/user/financial-tips.php');

// =====================================================
// TELLER ROUTES
// =====================================================

// Teller authentication
$router->post('/teller/set-password', 'src/api/teller/set_password.php');
$router->post('/teller/reset-password', 'src/api/teller/reset_password.php');

// Account operations
$router->get('/teller/search-account', 'src/api/teller/search_account.php');
$router->post('/teller/deposit', 'src/api/teller/deposit.php');
$router->post('/teller/withdraw', 'src/api/teller/withdraw.php');
$router->post('/teller/close-account', 'src/api/teller/close_account.php');
$router->post('/teller/reopen-account', 'src/api/teller/reopen_account.php');

// Registration management
$router->get('/teller/registrations', 'src/api/teller/get_registrations.php');
$router->post('/teller/registrations/review', 'src/api/teller/review_registration.php');

// Transaction history
$router->get('/teller/transactions', 'src/api/teller/get_transaction_history.php');
$router->get('/teller/search-history', 'src/api/teller/get_search_history.php');

// Dashboard
$router->get('/teller/dashboard', 'src/api/teller/get_dashboard_summary.php');

// Profile management
$router->get('/teller/profile', 'src/api/teller/view_profile.php');
$router->put('/teller/profile', 'src/api/teller/view_profile.php');

// =====================================================
// ADMIN ROUTES
// =====================================================

// Dashboard statistics
$router->get('/admin/dashboard', 'src/api/admin/dashboard_stats.php');

// User management
$router->get('/admin/users', 'src/api/admin/list_users.php');
$router->get('/admin/users/{id}', 'src/api/admin/get_user.php');
$router->put('/admin/users/{id}', 'src/api/admin/update.php');

// Teller management
$router->get('/admin/tellers', 'src/api/admin/list_tellers.php');
$router->post('/admin/tellers', 'src/api/admin/create_teller.php');
$router->get('/admin/tellers/{id}', 'src/api/admin/get_teller.php');
$router->put('/admin/tellers/{id}', 'src/api/admin/update.php');
$router->post('/admin/tellers/{id}/toggle-status', 'src/api/admin/toggle_teller_status.php');
$router->post('/admin/tellers/{id}/reset-password', 'src/api/admin/send_teller_reset_email.php');

// Transaction management
$router->get('/admin/transactions', 'src/api/admin/get_transactions.php');

// System information
$router->get('/admin/info', 'src/api/admin/info.php');

// =====================================================
// PUBLIC ROUTES
// =====================================================

// Contact form
$router->post('/public/contact', 'src/api/public/contact_submit.php');
$router->post('/public/contact-mailer', 'src/api/public/contact_mailer.php');

// =====================================================
// EXTERNAL API ROUTES
// =====================================================

// External transfer service
$router->post('/services/receive-external', 'src/api/services/receive_external.php');

// =====================================================
// ROUTE GROUPS (for middleware)
// =====================================================

// Routes that require authentication
$router->group(['middleware' => 'auth'], function($router) {
    // User authenticated routes
    $router->group(['prefix' => 'user', 'middleware' => 'user'], function($router) {
        $router->get('/profile', 'src/api/user/update_profile.php');
        $router->get('/accounts', 'src/api/user/accounts.php');
        $router->get('/transactions', 'src/api/user/transactions.php');
        $router->post('/transactions/transfer', 'src/api/user/fund_transfer.php');
    });
    
    // Teller authenticated routes
    $router->group(['prefix' => 'teller', 'middleware' => 'teller'], function($router) {
        $router->get('/search-account', 'src/api/teller/search_account.php');
        $router->post('/deposit', 'src/api/teller/deposit.php');
        $router->post('/withdraw', 'src/api/teller/withdraw.php');
        $router->get('/transactions', 'src/api/teller/get_transaction_history.php');
    });
    
    // Admin authenticated routes
    $router->group(['prefix' => 'admin', 'middleware' => 'admin'], function($router) {
        $router->get('/dashboard', 'src/api/admin/dashboard_stats.php');
        $router->get('/users', 'src/api/admin/list_users.php');
        $router->get('/tellers', 'src/api/admin/list_tellers.php');
        $router->post('/tellers', 'src/api/admin/create_teller.php');
    });
});

// Routes that require OTP verification
$router->group(['middleware' => 'otp'], function($router) {
    $router->post('/user/register', 'src/api/user/submit_registration.php');
    $router->post('/user/accounts/create', 'src/api/user/create_additional_account.php');
    $router->post('/user/transactions/transfer', 'src/api/user/fund_transfer.php');
    $router->post('/user/transactions/external-transfer', 'src/api/user/external_transfer.php');
});

// =====================================================
// ERROR HANDLING ROUTES
// =====================================================

// 404 Not Found
$router->notFound(function() {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'API endpoint not found',
        'error' => '404 Not Found'
    ]);
});

// 405 Method Not Allowed
$router->methodNotAllowed(function() {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed',
        'error' => '405 Method Not Allowed'
    ]);
});

return $router; 
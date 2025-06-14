// Global API object that extends API_ENDPOINTS from config.js
const API = {
    // Authentication endpoints
    AUTH: {
        LOGIN: `${BASE_PATH.API}/auth/login.php`,
        LOGOUT: `${BASE_PATH.API}/auth/logout.php`,
        SESSION_CHECK: `${BASE_PATH.API}/auth/session_check.php`,
        VERIFY_OTP: `${BASE_PATH.API}/auth/verify_otp.php`,
        SEND_OTP: `${BASE_PATH.API}/auth/send_otp.php`,
        KILL_SESSION: `${BASE_PATH.API}/auth/kill_session.php`
    },
    
    // User-specific endpoints
    USER: {
        PROFILE: `${BASE_PATH.API}/user/profile.php`,
        ACCOUNTS: `${BASE_PATH.API}/user/accounts.php`,
        TRANSACTIONS: `${BASE_PATH.API}/user/transactions.php`,
        FINANCIAL_TIPS: `${BASE_PATH.API}/user/financial-tips.php`,
        TRANSFER: `${BASE_PATH.API}/user/transfer.php`,
        INTERNAL_TRANSFER: `${BASE_PATH.API}/user/fund_transfer.php`,
        EXTERNAL_TRANSFER: `${BASE_PATH.API}/user/external_transfer.php`
    },
    
    // Content endpoints
    CONTENT: {}
}; 
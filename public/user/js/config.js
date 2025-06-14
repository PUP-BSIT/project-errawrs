// Base path configuration
const BASE_PATH = {
    // API base path - will be used for all API calls
    API: '/project-errawrs/src/api',
    
    // Assets base path
    ASSETS: '/project-errawrs/public/assets',
    
    // Routes base path for navigation
    ROUTES: {
        USER: '/project-errawrs/public/user',  // Absolute path for user routes
        ADMIN: '/project-errawrs/public/admin',
        TELLER: '/project-errawrs/public/teller'
    }
};

// API endpoints configuration
const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${BASE_PATH.API}/auth/login.php`,
        LOGOUT: `${BASE_PATH.API}/auth/logout.php`,
        SESSION_CHECK: `${BASE_PATH.API}/auth/session_check.php`,
        VERIFY_OTP: `${BASE_PATH.API}/auth/verify_otp.php`,
        SEND_OTP: `${BASE_PATH.API}/auth/send_otp.php`
    },
    USER: {
        PROFILE: `${BASE_PATH.API}/user/profile.php`,
        ACCOUNTS: `${BASE_PATH.API}/user/accounts.php`,
        TRANSACTION: `${BASE_PATH.API}/user/transaction.php`,
        TRANSFER: `${BASE_PATH.API}/user/transfer.php`
    }
};

// Route paths configuration
const ROUTES = {
    LOGIN: `${BASE_PATH.ROUTES.USER}/login_account_holder.html`,
    DASHBOARD: `${BASE_PATH.ROUTES.USER}/user_dashboard.html`,
    PROFILE: `${BASE_PATH.ROUTES.USER}/profile.html`,
    ACCOUNT: `${BASE_PATH.ROUTES.USER}/account.html`,
    TRANSACTION: `${BASE_PATH.ROUTES.USER}/transaction.html`,
    TRANSFER: `${BASE_PATH.ROUTES.USER}/transfer.html`,
    CONTACT: `${BASE_PATH.ROUTES.USER}/contact_us.html`,
    REGISTRATION: `${BASE_PATH.ROUTES.USER}/registration.html`
}; 
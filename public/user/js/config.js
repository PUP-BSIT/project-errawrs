// Auto-detect the correct base URL for different environments
function getApiBaseUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Check if we're on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '/project-errawrs/src/api';
    }
    
    // Check if we're on the development site
    if (hostname === 'dev.stackovercash.site') {
        return '/src/api'; // Assuming the project is at the root
    }
    
    // For production or other environments, try to detect the path
    const pathname = window.location.pathname;
    if (pathname.includes('/project-errawrs/')) {
        return '/project-errawrs/src/api';
    } else if (pathname.includes('/public/')) {
        // If we're in public directory, go up to src/api
        return '/src/api';
    } else {
        // Default fallback
        return '/src/api';
    }
}

const API_BASE_URL = getApiBaseUrl();

console.log('Detected API Base URL:', API_BASE_URL);
console.log('Current hostname:', window.location.hostname);
console.log('Current pathname:', window.location.pathname);

const API_ENDPOINTS = {
    LOGIN: `${API_BASE_URL}/auth/login.php`,
    LOGOUT: `${API_BASE_URL}/auth/logout.php`,
    SEND_OTP: `${API_BASE_URL}/auth/send_otp.php`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify_otp.php`,
    SUBMIT_REGISTRATION: `${API_BASE_URL}/user/submit_registration.php`,
    SESSION_CHECK: `${API_BASE_URL}/auth/session_check.php`,
    GET_ACCOUNTS: `${API_BASE_URL}/user/accounts.php`,
    FUND_TRANSFER: `${API_BASE_URL}/user/fund_transfer.php`,
    INTERNAL_TRANSFER: `${API_BASE_URL}/user/fund_transfer.php`,
    EXTERNAL_TRANSFER: `${API_BASE_URL}/user/external_transfer.php`,
    GET_TRANSACTIONS: `${API_BASE_URL}/user/transactions.php`,
    GET_TRANSACTION_DETAILS: `${API_BASE_URL}/user/get_transaction_details.php`,
    UPDATE_PROFILE: `${API_BASE_URL}/user/update_profile.php`,
    CREATE_ADDITIONAL_ACCOUNT: `${API_BASE_URL}/user/create_additional_account.php`,
    FORGOT_USERNAME: `${API_BASE_URL}/user/forgot_username.php`,
    REQUEST_PASSWORD_RESET: `${API_BASE_URL}/user/request_password_reset.php`,
    VERIFY_RESET_TOKEN: `${API_BASE_URL}/user/verify_reset_token.php`,
    RESET_PASSWORD: `${API_BASE_URL}/user/reset_password.php`,
    FINANCIAL_TIPS: `${API_BASE_URL}/user/financial-tips.php`,
    CONTACT_SUBMIT: `${API_BASE_URL}/public/contact_mailer.php`,
};

// Backward compatibility - keep the old nested structure
API_ENDPOINTS.AUTH = {
    LOGIN: API_ENDPOINTS.LOGIN,
    LOGOUT: API_ENDPOINTS.LOGOUT,
    SEND_OTP: API_ENDPOINTS.SEND_OTP,
    VERIFY_OTP: API_ENDPOINTS.VERIFY_OTP,
    SESSION_CHECK: API_ENDPOINTS.SESSION_CHECK
};

// Backward compatibility - keep the old USER structure
API_ENDPOINTS.USER = {
    TRANSACTIONS: API_ENDPOINTS.GET_TRANSACTIONS,
    ACCOUNTS: API_ENDPOINTS.GET_ACCOUNTS
};

// Function to get the correct base path for routes
function getRoutesBasePath() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    // Localhost (XAMPP, WAMP, etc.)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Try to detect the project folder
        if (pathname.includes('/project-errawrs/public/user/')) {
            return '/project-errawrs/public/user';
        } else if (pathname.includes('/project-errawrs/user/')) {
            return '/project-errawrs/user';
        }
        // fallback
        return '/project-errawrs/public/user';
    }

    // Production (Nginx)
    return '/user';
}

const ROUTES_BASE_PATH = getRoutesBasePath();
const ROUTES = {
    USER_DASHBOARD: `${ROUTES_BASE_PATH}/user_dashboard.html`,
    LOGIN: `${ROUTES_BASE_PATH}/login_account_holder.html`,
    PROFILE: `${ROUTES_BASE_PATH}/profile.html`,
    ACCOUNT: `${ROUTES_BASE_PATH}/account.html`,
    TRANSACTION: `${ROUTES_BASE_PATH}/transaction.html`,
    TRANSFER: `${ROUTES_BASE_PATH}/transfer.html`,
    TRANSFER_SUCCESS: `${ROUTES_BASE_PATH}/transfer_success.html`,
    TRANSFER_FAILED: `${ROUTES_BASE_PATH}/transfer_failed.html`,
    CONTACT: `${ROUTES_BASE_PATH}/contact_us.html`,
    REGISTRATION: `${ROUTES_BASE_PATH}/registration.html`,
};

// Function to dynamically create notification
function createNotification(message, type = 'info', duration = 5000) {
    const container = document.querySelector('.notification-container') || document.body;
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
} 
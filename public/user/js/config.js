function getApiBaseUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const pathname = window.location.pathname;
    if (pathname.includes('/project-errawrs/')) {
        return '/project-errawrs/api';
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '/api';
    }

    // Check if we're on the development site
    if (hostname === 'dev.stackovercash.site') {
        return '/api';
    }
    // For production or other environments
    if (pathname.includes('/public/')) {
        return '/api';
    } else {
        return '/api';
    }
}

const API_BASE_URL = getApiBaseUrl();

console.log('Detected API Base URL:', API_BASE_URL);
console.log('Current hostname:', window.location.hostname);
console.log('Current pathname:', window.location.pathname);

const API_ENDPOINTS = {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    SEND_OTP: `${API_BASE_URL}/auth/send-otp`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    SUBMIT_REGISTRATION: `${API_BASE_URL}/user/register`,
    SESSION_CHECK: `${API_BASE_URL}/auth/session-check`,
    GET_ACCOUNTS: `${API_BASE_URL}/user/accounts`,
    FUND_TRANSFER: `${API_BASE_URL}/user/transactions/transfer`,
    INTERNAL_TRANSFER: `${API_BASE_URL}/user/transactions/transfer`,
    EXTERNAL_TRANSFER: `${API_BASE_URL}/user/transactions/external-transfer`,
    GET_TRANSACTIONS: `${API_BASE_URL}/user/transactions`,
    GET_TRANSACTION_DETAILS: `${API_BASE_URL}/user/get_transaction_details.php`,
    UPDATE_PROFILE: `${API_BASE_URL}/user/update_profile.php`,
    CREATE_ADDITIONAL_ACCOUNT: `${API_BASE_URL}/user/accounts/create`,
    FORGOT_USERNAME: `${API_BASE_URL}/auth/forgot-username`,
    REQUEST_PASSWORD_RESET: `${API_BASE_URL}/auth/request-password-reset`,
    VERIFY_RESET_TOKEN: `${API_BASE_URL}/auth/verify-reset-token`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    FINANCIAL_TIPS: `${API_BASE_URL}/user/financial-tips`,
    CONTACT_SUBMIT: `${API_BASE_URL}/public/contact-mailer`,
    TRANSFER_SUCCESS: `${API_BASE_URL}/user/transactions/success`,
};

// Backward compatibility - keep the old nested structure
API_ENDPOINTS.AUTH = {
    LOGIN: API_ENDPOINTS.LOGIN,
    LOGOUT: API_ENDPOINTS.LOGOUT,
    SEND_OTP: API_ENDPOINTS.SEND_OTP,
    VERIFY_OTP: API_ENDPOINTS.VERIFY_OTP,
    SESSION_CHECK: API_ENDPOINTS.SESSION_CHECK,
    KILL_SESSION: `${API_BASE_URL}/auth/kill_session.php`,
};

// Backward compatibility - keep the old USER structure
API_ENDPOINTS.USER = {
    TRANSACTIONS: API_ENDPOINTS.GET_TRANSACTIONS,
    ACCOUNTS: API_ENDPOINTS.GET_ACCOUNTS,
    CREATE_ADDITIONAL_ACCOUNT: API_ENDPOINTS.CREATE_ADDITIONAL_ACCOUNT,
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
    USER_DASHBOARD: '/user/dashboard',
    LOGIN: '/login',
    PROFILE: '/user/profile',
    ACCOUNT: '/user/account',
    TRANSACTION: '/user/transactions',
    TRANSFER: '/user/transfer',
    TRANSFER_SUCCESS: '/user/transfer_success',
    TRANSFER_FAILED: '/user/transfer_failed',
    CONTACT: '/contact-us',
    ABOUT: '/about-us',
    REGISTRATION: '/registration',
};

// Function to dynamically create notification
function createNotification(message, type = 'info', duration = 5000) {
    const container =
        document.querySelector('.notification-container') || document.body;
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
}
window.ROUTES = ROUTES;
window.API_ENDPOINTS = API_ENDPOINTS;
window.API_BASE_URL = API_BASE_URL;
console.log('config.js loaded, ROUTES =', window.ROUTES);

// Add a function to get the static asset base URL
function getStaticAssetBaseUrl() {
    // For most environments, assets are served from root
    return '';
}
const STATIC_ASSET_BASE_URL = getStaticAssetBaseUrl();
window.STATIC_ASSET_BASE_URL = STATIC_ASSET_BASE_URL;
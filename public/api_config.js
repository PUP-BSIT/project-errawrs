// public/api_config.js
// Centralized API endpoint config for both teller and user

// API base URL
const API_BASE_URL = '/api';

console.log('Detected API Base URL:', API_BASE_URL);
console.log('Current hostname:', window.location.hostname);
console.log('Current pathname:', window.location.pathname);

const API_ENDPOINTS = {
    // Teller endpoints
    TELLER_LOGIN: `${API_BASE_URL}/auth/login`,
    TELLER_LOGOUT: `${API_BASE_URL}/auth/logout`,
    TELLER_SET_PASSWORD: `${API_BASE_URL}/teller/set-password`,
    TELLER_RESET_PASSWORD: `${API_BASE_URL}/teller/reset-password`,
    TELLER_SEARCH_ACCOUNT: `${API_BASE_URL}/teller/search-account`,
    TELLER_DEPOSIT: `${API_BASE_URL}/teller/deposit`,
    TELLER_WITHDRAW: `${API_BASE_URL}/teller/withdraw`,
    TELLER_CLOSE_ACCOUNT: `${API_BASE_URL}/teller/close-account`,
    TELLER_REOPEN_ACCOUNT: `${API_BASE_URL}/teller/reopen-account`,
    TELLER_REGISTRATIONS: `${API_BASE_URL}/teller/registrations`,
    TELLER_REVIEW_REGISTRATION: `${API_BASE_URL}/teller/registrations/review`,
    TELLER_TRANSACTIONS: `${API_BASE_URL}/teller/transactions`,
    TELLER_SEARCH_HISTORY: `${API_BASE_URL}/teller/search-history`,
    TELLER_DASHBOARD: `${API_BASE_URL}/teller/dashboard`,
    TELLER_PROFILE: `${API_BASE_URL}/teller/profile`,

    // User endpoints
    USER_LOGIN: `${API_BASE_URL}/auth/login`,
    USER_LOGOUT: `${API_BASE_URL}/auth/logout`,
    USER_SEND_OTP: `${API_BASE_URL}/auth/send-otp`,
    USER_VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    USER_SUBMIT_REGISTRATION: `${API_BASE_URL}/user/register`,
    USER_SESSION_CHECK: `${API_BASE_URL}/auth/session-check`,
    USER_GET_ACCOUNTS: `${API_BASE_URL}/user/accounts`,
    USER_FUND_TRANSFER: `${API_BASE_URL}/user/transactions/transfer`,
    USER_INTERNAL_TRANSFER: `${API_BASE_URL}/user/transactions/transfer`,
    USER_EXTERNAL_TRANSFER: `${API_BASE_URL}/user/transactions/external-transfer`,
    USER_GET_TRANSACTIONS: `${API_BASE_URL}/user/transactions`,
    USER_UPDATE_PROFILE: `${API_BASE_URL}/user/profile`,
    USER_CREATE_ADDITIONAL_ACCOUNT: `${API_BASE_URL}/user/accounts/create`,
    USER_FORGOT_USERNAME: `${API_BASE_URL}/auth/forgot-username`,
    USER_REQUEST_PASSWORD_RESET: `${API_BASE_URL}/auth/request-password-reset`,
    USER_VERIFY_RESET_TOKEN: `${API_BASE_URL}/auth/verify-reset-token`,
    USER_RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    USER_FINANCIAL_TIPS: `${API_BASE_URL}/user/financial-tips`,
    USER_CONTACT_SUBMIT: `${API_BASE_URL}/public/contact-mailer`,
    USER_TRANSFER_SUCCESS: `${API_BASE_URL}/user/transactions/success`,

    // Grouped for convenience
    TELLER: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
        SET_PASSWORD: `${API_BASE_URL}/teller/set-password`,
        RESET_PASSWORD: `${API_BASE_URL}/teller/reset-password`,
        SEARCH_ACCOUNT: `${API_BASE_URL}/teller/search-account`,
        DEPOSIT: `${API_BASE_URL}/teller/deposit`,
        WITHDRAW: `${API_BASE_URL}/teller/withdraw`,
        CLOSE_ACCOUNT: `${API_BASE_URL}/teller/close-account`,
        REOPEN_ACCOUNT: `${API_BASE_URL}/teller/reopen-account`,
        REGISTRATIONS: `${API_BASE_URL}/teller/registrations`,
        REVIEW_REGISTRATION: `${API_BASE_URL}/teller/registrations/review`,
        TRANSACTIONS: `${API_BASE_URL}/teller/transactions`,
        SEARCH_HISTORY: `${API_BASE_URL}/teller/search-history`,
        DASHBOARD: `${API_BASE_URL}/teller/dashboard`,
        PROFILE: `${API_BASE_URL}/teller/profile`,
    },
    USER: {
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
        UPDATE_PROFILE: `${API_BASE_URL}/user/profile`,
        CREATE_ADDITIONAL_ACCOUNT: `${API_BASE_URL}/user/accounts/create`,
        FORGOT_USERNAME: `${API_BASE_URL}/auth/forgot-username`,
        REQUEST_PASSWORD_RESET: `${API_BASE_URL}/auth/request-password-reset`,
        VERIFY_RESET_TOKEN: `${API_BASE_URL}/auth/verify-reset-token`,
        RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
        FINANCIAL_TIPS: `${API_BASE_URL}/user/financial-tips`,
        CONTACT_SUBMIT: `${API_BASE_URL}/public/contact-mailer`,
        TRANSFER_SUCCESS: `${API_BASE_URL}/user/transactions/success`,
    }
};


const ROUTES_BASE_PATH = "/user";
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
    // Teller routes
    TELLER_LOGIN: '/login',
    TELLER_DASHBOARD: '/dashboard',
    TELLER_SEARCH: '/search',
    TELLER_DEPOSIT: '/deposit',
    TELLER_WITHDRAW: '/withdraw',
    TELLER_HISTORY: '/history',
    TELLER_PROFILE: '/profile',
    TELLER_REGISTRATIONS: '/registrations',
    TELLER_SET_PASSWORD: '/set-password',
    TELLER_RESET_PASSWORD: '/reset-password',
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

export { API_BASE_URL, API_ENDPOINTS, ROUTES_BASE_PATH, ROUTES, createNotification }; 
const API_BASE_URL = '/project-errawrs/src/api';

const BASE_PATH = {
    API: API_BASE_URL
};

const API_ENDPOINTS = {
    LOGIN: `${API_BASE_URL}/auth/login.php`,
    LOGOUT: `${API_BASE_URL}/auth/logout.php`,
    SEND_OTP: `${API_BASE_URL}/auth/send_otp.php`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify_otp.php`,
    SUBMIT_REGISTRATION: `${API_BASE_URL}/user/submit_registration.php`,
    SESSION_CHECK: `${API_BASE_URL}/auth/session_check.php`,
    GET_ACCOUNTS: `${API_BASE_URL}/user/accounts.php`,
    FUND_TRANSFER: `${API_BASE_URL}/user/fund_transfer.php`,
    GET_TRANSACTIONS: `${API_BASE_URL}/user/transactions.php`,
    GET_TRANSACTION_DETAILS: `${API_BASE_URL}/user/get_transaction_details.php`,
    UPDATE_PROFILE: `${API_BASE_URL}/user/update_profile.php`,
    CREATE_ADDITIONAL_ACCOUNT: `${API_BASE_URL}/user/create_additional_account.php`,
    FORGOT_USERNAME: `${API_BASE_URL}/user/forgot_username.php`,
    REQUEST_PASSWORD_RESET: `${API_BASE_URL}/user/request_password_reset.php`,
    VERIFY_RESET_TOKEN: `${API_BASE_URL}/user/verify_reset_token.php`,
    RESET_PASSWORD: `${API_BASE_URL}/user/reset_password.php`,
};

const ROUTES = {
    USER_DASHBOARD: '/project-errawrs/public/user/user_dashboard.html',
    LOGIN: '/project-errawrs/public/user/login_account_holder.html',
    PROFILE: '/project-errawrs/public/user/profile.html',
    ACCOUNT: '/project-errawrs/public/user/account.html',
    TRANSACTION: '/project-errawrs/public/user/transaction.html',
    TRANSFER: '/project-errawrs/public/user/transfer.html',
    TRANSFER_SUCCESS: '/project-errawrs/public/user/transfer_success.html',
    CONTACT: '/project-errawrs/public/user/contact_us.html',
    REGISTRATION: '/project-errawrs/public/user/registration.html',
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
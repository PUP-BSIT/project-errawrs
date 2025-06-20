// Base paths for the application
const BASE_PATH = {
    ROOT: '/project-errawrs',
    ROUTES: {
        USER: '/project-errawrs/public/user',
        TELLER: '/project-errawrs/public/teller',
        ADMIN: '/project-errawrs/public/admin'
    }
};

// API endpoints
const API = {
    AUTH: {
        LOGIN: BASE_PATH.ROOT + '/src/api/auth/login.php',
        LOGOUT: BASE_PATH.ROOT + '/src/api/auth/logout.php',
        SESSION_CHECK: BASE_PATH.ROOT + '/src/api/auth/session_check.php',
        SEND_OTP: BASE_PATH.ROOT + '/src/api/auth/send_otp.php',
        VERIFY_OTP: BASE_PATH.ROOT + '/src/api/auth/verify_otp.php'
    },
    USER: {
        ACCOUNTS: BASE_PATH.ROOT + '/src/api/user/accounts.php',
        REGISTER: BASE_PATH.ROOT + '/src/api/user/register.php',
        INTERNAL_TRANSFER: BASE_PATH.ROOT + '/src/api/user/fund_transfer.php',
        EXTERNAL_TRANSFER: BASE_PATH.ROOT + '/src/api/user/external_transfer.php'
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
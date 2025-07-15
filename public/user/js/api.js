// Global API object that extends API_ENDPOINTS from config.js
const API = {
    // Authentication endpoints
    AUTH: {
        LOGIN: API_ENDPOINTS.LOGIN,
        LOGOUT: API_ENDPOINTS.LOGOUT,
        SESSION_CHECK: API_ENDPOINTS.SESSION_CHECK,
        VERIFY_OTP: API_ENDPOINTS.VERIFY_OTP,
        SEND_OTP: API_ENDPOINTS.SEND_OTP,
        KILL_SESSION: `${API_BASE_URL}/auth/kill_session.php`
    },
    
    // User-specific endpoints
    USER: {
        PROFILE: API_ENDPOINTS.UPDATE_PROFILE,
        ACCOUNTS: API_ENDPOINTS.GET_ACCOUNTS,
        TRANSACTIONS: API_ENDPOINTS.GET_TRANSACTIONS,
        FINANCIAL_TIPS: API_ENDPOINTS.FINANCIAL_TIPS,
        TRANSFER: API_ENDPOINTS.FUND_TRANSFER,
        INTERNAL_TRANSFER: API_ENDPOINTS.FUND_TRANSFER,
        EXTERNAL_TRANSFER: `${API_BASE_URL}/user/external_transfer.php`
    },
    
    // Content endpoints
    CONTENT: {}
}; 
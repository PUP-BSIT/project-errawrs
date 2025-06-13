// Add account-specific endpoints
Object.assign(API_ENDPOINTS.USER, {
    CREATE_ACCOUNT: `${BASE_PATH.API}/user/create_additional_account.php`,
    UPDATE_PROFILE: `${BASE_PATH.API}/user/profile/update.php`
});

const TEXT = {
    SESSION_EXPIRED: 'Session expired or invalid',
    USER_DATA_ERROR: 'Error fetching user data',
    FETCH_ACCOUNTS_ERROR: 'Failed to fetch accounts',
    ACCOUNTS_ERROR: 'Error fetching accounts',
    PROFILE_UPDATE_SUCCESS: 'Profile updated successfully',
    PROFILE_UPDATE_ERROR: 'Failed to update profile',
    ACCOUNT_CREATE_SUCCESS: 'Account created successfully',
    ACCOUNT_CREATE_ERROR: 'Failed to create account',
    OTP_SEND_SUCCESS: 'OTP sent successfully',
    OTP_SEND_ERROR: 'Failed to send OTP',
    OTP_VERIFY_SUCCESS: 'OTP verified successfully',
    OTP_VERIFY_ERROR: 'Failed to verify OTP',
    LOGOUT_SUCCESS: 'Logged out successfully',
    LOGOUT_ERROR: 'Failed to logout'
};

const CLASS = {
    ERROR: 'error',
    SUCCESS: 'success',
    WARNING: 'warning',
    INFO: 'info',
    HIDDEN: 'hidden',
    ADD_ACCOUNT_PLACEHOLDER: 'add-account-placeholder'
};

const TIMING = {
    REDIRECT_DELAY: 2000,
    NOTIFICATION_DURATION: 3000
};

const ACCOUNT_LIMITS = {
    MAX_ACCOUNTS: 3
};

// DOM Elements
const DOM = {
    accountList: document.querySelector('.account-list-container'),
    notification: document.querySelector('.notification-container'),
    modals: {
        accountType: document.getElementById('account_type_modal'),
        confirmation: document.getElementById('confirmation_modal'),
        otp: document.getElementById('otp_modal'),
        processing: document.getElementById('processing_modal'),
        editProfile: document.getElementById('edit_profile_modal')
    },
    buttons: {
        proceedAccountType: document.getElementById('proceed_account_type_button'),
        cancelAccountType: document.getElementById('cancel_account_type_button'),
        proceedAddAccount: document.getElementById('proceed_add_account_button'),
        cancelAddAccount: document.getElementById('cancel_add_account_button'),
        verifyOtp: document.getElementById('verify_otp_button'),
        cancelOtp: document.getElementById('cancel_otp_button'),
        closeProcessing: document.getElementById('close_processing_button'),
        saveProfile: document.getElementById('save_profile_button'),
        exitProfile: document.getElementById('exit_profile_button'),
        editProfile: document.getElementById('edit_profile_icon')
    },
    inputs: {
        accountTypeRadios: document.querySelectorAll('input[name="account_type"]'),
        confirmAddAccount: document.getElementById('confirm_add_account_checkbox'),
        otp: document.getElementById('otp_input'),
        editFirstName: document.getElementById('edit_first_name'),
        editLastName: document.getElementById('edit_last_name'),
        editUsername: document.getElementById('edit_username'),
        editPassword: document.getElementById('edit_password'),
        editConfirmPassword: document.getElementById('edit_confirm_password'),
        editPhoneNumber: document.getElementById('edit_phone_number')
    },
    displays: {
        selectedAccountType: document.getElementById('selected_account_type'),
        userName: document.getElementById('user_name'),
        welcomeUserName: document.getElementById('welcome_user_name'),
        userAvatar: document.getElementById('user_avatar_container')
    }
};

// State
let state = {
    selectedAccountType: null,
    userAccounts: [],
    userData: {}
};

// Fetch user data from API
async function fetchUserData() {
    try {
        const response = await fetch(API_ENDPOINTS.AUTH.SESSION_CHECK, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.authenticated) {
            state.userData = data.user;
            updateUserDisplay();
        } else {
            showNotification(data.error || TEXT.SESSION_EXPIRED, CLASS.ERROR);
            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, TIMING.REDIRECT_DELAY);
        }
    } catch (error) {
        showNotification(TEXT.USER_DATA_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Update user display elements
function updateUserDisplay() {
    if (DOM.displays.userName) {
        DOM.displays.userName.textContent = `${state.userData.first_name} ${state.userData.last_name}`.trim();
    }
    if (DOM.displays.welcomeUserName) {
        DOM.displays.welcomeUserName.textContent = state.userData.first_name;
    }
    displayUserInitial();
}

// Fetch user accounts from API
async function fetchUserAccounts() {
    try {
        const response = await fetch(API_ENDPOINTS.USER.ACCOUNTS, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            state.userAccounts = data.accounts;
            updateAccountDisplay();
        } else {
            showNotification(data.error || TEXT.FETCH_ACCOUNTS_ERROR, CLASS.ERROR);
        }
    } catch (error) {
        showNotification(TEXT.ACCOUNTS_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Update account display
function updateAccountDisplay() {
    if (!DOM.accountList) return;

    DOM.accountList.innerHTML = '';

    // Display existing accounts
    state.userAccounts.forEach((account) => {
        const accountItem = createAccountItem(account);
        DOM.accountList.appendChild(accountItem);
    });

    // Add "Add Account" placeholder if under limit
    if (state.userAccounts.length < ACCOUNT_LIMITS.MAX_ACCOUNTS) {
        const addAccountPlaceholder = createAddAccountPlaceholder();
        DOM.accountList.appendChild(addAccountPlaceholder);
    }
}

// Create account item element
function createAccountItem(account) {
    const accountItem = document.createElement('div');
    accountItem.className = 'account-item';
    
    // Format account number with spaces
    const formattedAccountNumber = account.account_number.replace(/(\d{4})/g, '$1 ').trim();
    
    // Determine account status class
    const statusClass = account.status?.toLowerCase() === 'active' ? 'active' : 'closed';
    
    // Determine account type class
    const accountTypeClass = account.account_type?.toLowerCase() || 'standard';
    
    accountItem.innerHTML = `
        <div class="account-info">
            <div class="info-group">
                <span class="info-label">Account Number</span>
                <span class="info-value">${formattedAccountNumber}</span>
            </div>
            <div class="info-group">
                <span class="info-label">Type</span>
                <span class="account-type-badge ${accountTypeClass}">
                    ${account.account_type || 'Standard'}
                </span>
            </div>
            <div class="info-group">
                <span class="info-label">Balance</span>
                <span class="info-value">₱ ${parseFloat(account.balance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}</span>
            </div>
            <div class="info-group">
                <span class="info-label">Status</span>
                <span class="account-status ${statusClass}">
                    ${account.status || 'Active'}
                </span>
            </div>
        </div>
        <div class="account-actions">
            <button class="three-dots-button" aria-label="Account actions">
                <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="action-menu hidden">
                <button class="menu-item transfer-button" data-account="${account.account_number}">
                    Transfer Money
                </button>
                <button class="menu-item close-button" data-account="${account.account_number}">
                    Close Account
                </button>
            </div>
        </div>`;

    // Add event listeners for the three dots menu
    const threeDots = accountItem.querySelector('.three-dots-button');
    const actionMenu = accountItem.querySelector('.action-menu');
    
    threeDots.addEventListener('click', (e) => {
        e.stopPropagation();
        actionMenu.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        actionMenu.classList.add('hidden');
    });

    return accountItem;
}

// Create add account placeholder
function createAddAccountPlaceholder() {
    const placeholder = document.createElement('div');
    placeholder.className = 'add-account-placeholder';
    
    placeholder.innerHTML = `
        <i class="fas fa-plus-circle"></i>
        <span>Add New Account</span>
    `;
    
    placeholder.addEventListener('click', () => {
        if (DOM.modals.accountType) {
            DOM.modals.accountType.classList.remove(CLASS.HIDDEN);
        }
    });
    
    return placeholder;
}

// Show notification
function showNotification(message, type = CLASS.INFO) {
    if (!DOM.notification) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => notification.remove());

    DOM.notification.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, TIMING.NOTIFICATION_DURATION);
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case CLASS.SUCCESS:
            return 'fa-check-circle';
        case CLASS.ERROR:
            return 'fa-exclamation-circle';
        case CLASS.WARNING:
            return 'fa-exclamation-triangle';
        default:
            return 'fa-info-circle';
    }
}

// Display user initial in avatar
function displayUserInitial() {
    if (!DOM.displays.userAvatar || !state.userData.first_name) return;
    
    const initial = state.userData.first_name.charAt(0).toUpperCase();
    DOM.displays.userAvatar.innerHTML = `<span class="user-initial">${initial}</span>`;
}

// Event Handlers
async function handleAddAccount() {
    if (!DOM.modals.accountType) return;
    DOM.modals.accountType.classList.add('active');
}

async function handleLogout() {
    try {
        const response = await fetch(API.AUTH.LOGOUT);
        const data = await response.json();

        if (data.success) {
            showNotification(TEXT.LOGOUT_SUCCESS, CLASS.SUCCESS);
            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, TIMING.REDIRECT_DELAY);
        } else {
            showNotification(data.error || TEXT.LOGOUT_ERROR, CLASS.ERROR);
        }
    } catch (error) {
        showNotification(TEXT.LOGOUT_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchUserData();
    fetchUserAccounts();
    
    // Add event listeners
    if (DOM.buttons.editProfile) {
        DOM.buttons.editProfile.addEventListener('click', () => {
            DOM.modals.editProfile.classList.add('active');
            populateProfileForm();
        });
    }
    
    // Add other event listeners as needed
});

// Export functions for use in other files
window.handleLogout = handleLogout; 
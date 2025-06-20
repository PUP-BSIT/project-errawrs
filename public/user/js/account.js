// Extend the existing API object from session-manager.js
// Add account-specific endpoints
if (!API.USER) API.USER = {};
if (!API.AUTH) API.AUTH = {};

// Add or update USER endpoints
Object.assign(API.USER, {
        ACCOUNTS: '../../src/api/user/accounts.php',
        CREATE_ACCOUNT: '../../src/api/user/create_additional_account.php',
        UPDATE_PROFILE: '../../src/api/user/profile/update.php'
});

// Add or update AUTH endpoints
Object.assign(API.AUTH, {
        SEND_OTP: '../../src/api/auth/send_otp.php',
    VERIFY_OTP: '../../src/api/auth/verify_otp.php'
});

// Routes
// No need to redefine ROUTES as it's already declared in session-manager.js

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

// Constants for account items
const ACCOUNT_UI = {
    CLASS: {
        ACCOUNT_ITEM: 'account-item',
        ACCOUNT_INFO: 'account-info',
        INFO_GROUP: 'info-group',
        INFO_LABEL: 'info-label',
        INFO_VALUE: 'info-value',
        ACCOUNT_TYPE_BADGE: 'account-type-badge',
        ACCOUNT_STATUS: 'account-status',
        ACCOUNT_ACTIONS: 'account-actions',
        THREE_DOTS_BUTTON: 'three-dots-button',
        ACTION_MENU: 'action-menu',
        MENU_ITEM: 'menu-item',
        TRANSFER_BUTTON: 'transfer-button',
        CLOSE_BUTTON: 'close-button',
        HIDDEN: 'hidden'
    },
    ICON: {
        ELLIPSIS_H: 'fas fa-ellipsis-h'
    },
    CURRENCY: {
        SYMBOL: '₱',
        LOCALE: 'en-US'
    },
    STATUS: {
        CLOSED: 'closed'
    }
};

// Constants
const CLASS = {
    HIDDEN: 'hidden',
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

const TEXT = {
    PHONE_NUMBER_NOT_FOUND: 'Phone number not found in user profile',
    OTP_SENT: 'OTP sent successfully. Please verify to complete account creation.',
    OTP_SEND_ERROR: 'Failed to send OTP',
    OTP_ERROR: 'Error sending OTP',
    ENTER_OTP: 'Please enter OTP',
    ACCOUNT_TYPE_NOT_FOUND: 'Account type not found. Please try again.',
    ACCOUNT_CREATED: 'Your request to open a new account is under review. You will be notified by email once it is processed.',
    ACCOUNT_ERROR: 'Failed to create account',
    INVALID_OTP: 'Invalid OTP',
    SESSION_EXPIRED: 'Session has expired. Please login again.',
    USER_DATA_ERROR: 'Error fetching user data',
    FETCH_ACCOUNTS_ERROR: 'Error fetching accounts',
    ACCOUNTS_ERROR: 'Error loading accounts',
    LOGOUT_SUCCESS: 'Successfully logged out',
    LOGOUT_ERROR: 'Error logging out'
};

const STORAGE_KEY = {
    PENDING_ACCOUNT_TYPE: 'pending_account_type'
};

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
    }, 3000); // Show for 3 seconds
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

// Fetch user data from API
async function fetchUserData() {
    try {
        console.log('Fetching user data...');
        const response = await fetch(API.AUTH.SESSION_CHECK, {
            credentials: 'include',  // Important for sending cookies
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        const data = await response.json();
        console.log('Session check full response:', data); // Debug log

        if (data.success && data.authenticated) {
            state.userData = data.user;
            console.log('User data:', state.userData);
            
            // Check for account in user data
            if (data.user && data.user.account) {
                console.log('Account data found in user:', data.user.account);
                state.userAccounts = [data.user.account];
            } 
            // Check for account in userInfo (from logs we see it's here)
            else if (data.userInfo && data.userInfo.account) {
                console.log('Account data found in userInfo:', data.userInfo.account);
                state.userAccounts = [data.userInfo.account];
            } else {
                console.log('No account data found');
                state.userAccounts = [];
            }
            
            updateUserDisplay();
            updateAccountDisplay();
        } else {
            console.log('Session check failed:', data); // Debug log
            showNotification(data.error || TEXT.SESSION_EXPIRED, CLASS.ERROR);
            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, TIMING.REDIRECT_DELAY);
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        showNotification(TEXT.USER_DATA_ERROR, CLASS.ERROR);
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

// Display user initial in avatar
function displayUserInitial() {
    if (!DOM.displays.userAvatar || !state.userData.first_name) return;
    
    const initial = state.userData.first_name.charAt(0).toUpperCase();
    DOM.displays.userAvatar.innerHTML = `<span class="user-initial">${initial}</span>`;
}

// Fetch user accounts from API
async function fetchUserAccounts() {
    try {
        // Use session check endpoint which already includes account data
        const response = await fetch(API.AUTH.SESSION_CHECK);
        const data = await response.json();

        if (data.success && data.authenticated) {
            // Extract accounts array from user data
            state.userAccounts = data.user.account ? [data.user.account] : [];
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
    if (!DOM.accountList) {
        console.error('Account list container not found');
        return;
    }

    DOM.accountList.innerHTML = '';

    console.log('Updating account display with accounts:', state.userAccounts); // Debug log

    // Display existing accounts
    if (state.userAccounts && state.userAccounts.length > 0) {
        state.userAccounts.forEach((account) => {
            const accountItem = createAccountItem(account);
            DOM.accountList.appendChild(accountItem);
        });
    }

    // Add "Add Account" card only if user has fewer than 3 accounts
    if (!state.userAccounts || state.userAccounts.length < 3) {
        const addAccountItem = document.createElement('div');
        addAccountItem.classList.add('account-item', 'add-account-item');
        addAccountItem.innerHTML = `
            <div class="add-account-icon">
                <i class="fas fa-plus"></i>
            </div>
            <div class="add-account-text">Add New Account</div>
        `;
        addAccountItem.addEventListener('click', handleAddAccount);
        DOM.accountList.appendChild(addAccountItem);
    }

    // Attach event listeners to the newly created account items
    attachAccountItemListeners();
}

// Create account item element
function createAccountItem(account) {
    console.log('Creating account item with:', account);
    
    const accountItem = document.createElement('div');
    accountItem.classList.add(ACCOUNT_UI.CLASS.ACCOUNT_ITEM);
    
    // Handle different account ID field names
    accountItem.dataset.accountId = account.account_id || account.id || '';

    // Format account_type for display (handle different field names)
    const accountType = account.type || account.account_type || 'savings';
    const accountTypeDisplay = accountType.charAt(0).toUpperCase() + accountType.slice(1);
    
    accountItem.innerHTML = `
        <div class="${ACCOUNT_UI.CLASS.ACCOUNT_INFO}">
            <div class="${ACCOUNT_UI.CLASS.INFO_GROUP}">
                <span class="${ACCOUNT_UI.CLASS.INFO_LABEL}">Account No.</span>
                <span class="${ACCOUNT_UI.CLASS.INFO_VALUE}">${account.account_number || ''}</span>
            </div>
            <div class="${ACCOUNT_UI.CLASS.INFO_GROUP}">
                <span class="${ACCOUNT_UI.CLASS.INFO_LABEL}">Type</span>
                <span class="${ACCOUNT_UI.CLASS.ACCOUNT_TYPE_BADGE} ${accountType.toLowerCase()}">${accountTypeDisplay}</span>
            </div>
            <div class="${ACCOUNT_UI.CLASS.INFO_GROUP}">
                <span class="${ACCOUNT_UI.CLASS.INFO_LABEL}">Balance</span>
                <span class="${ACCOUNT_UI.CLASS.INFO_VALUE}">${ACCOUNT_UI.CURRENCY.SYMBOL} ${parseFloat(
                    account.balance || 0
                ).toLocaleString(ACCOUNT_UI.CURRENCY.LOCALE, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}</span>
            </div>
            <div class="${ACCOUNT_UI.CLASS.INFO_GROUP}">
                <span class="${ACCOUNT_UI.CLASS.INFO_LABEL}">Status</span>
                <span class="${ACCOUNT_UI.CLASS.INFO_VALUE} ${ACCOUNT_UI.CLASS.ACCOUNT_STATUS} ${(account.status || 'active').toLowerCase()}">${account.status || 'Active'}</span>
            </div>
        </div>
        <div class="${ACCOUNT_UI.CLASS.ACCOUNT_ACTIONS}">
            <button class="${ACCOUNT_UI.CLASS.THREE_DOTS_BUTTON}" ${(account.status || '').toLowerCase() === ACCOUNT_UI.STATUS.CLOSED ? 'disabled' : ''}>
                <i class="${ACCOUNT_UI.ICON.ELLIPSIS_H}"></i>
            </button>
            <div class="${ACCOUNT_UI.CLASS.ACTION_MENU} ${ACCOUNT_UI.CLASS.HIDDEN}">
                <button class="${ACCOUNT_UI.CLASS.MENU_ITEM} ${ACCOUNT_UI.CLASS.TRANSFER_BUTTON}">Transfer</button>
                <button class="${ACCOUNT_UI.CLASS.MENU_ITEM} ${ACCOUNT_UI.CLASS.CLOSE_BUTTON}">Close</button>
            </div>
        </div>
    `;

    return accountItem;
}

// Attach event listeners to account items
function attachAccountItemListeners() {
    // CSS Classes
    const CLASS = {
        THREE_DOTS_BUTTON: 'three-dots-button',
        ACCOUNT_ACTIONS: 'account-actions',
        ACTION_MENU: 'action-menu',
        HIDDEN: 'hidden',
        TRANSFER_BUTTON: 'transfer-button',
        CLOSE_BUTTON: 'close-button',
        MENU_ITEM: 'menu-item'
    };
    
    // Handle three dots menu button
    document.querySelectorAll(`.${CLASS.THREE_DOTS_BUTTON}`).forEach((button) => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = e.target
                .closest(`.${CLASS.ACCOUNT_ACTIONS}`)
                .querySelector(`.${CLASS.ACTION_MENU}`);
            const allMenus = document.querySelectorAll(`.${CLASS.ACTION_MENU}`);

            // Close all other menus
            allMenus.forEach((m) => {
                if (m !== menu) m.classList.add(CLASS.HIDDEN);
            });

            menu.classList.toggle(CLASS.HIDDEN);
        });
    });

    // Handle menu item clicks
    document.querySelectorAll(`.${CLASS.MENU_ITEM}`).forEach((item) => {
        item.addEventListener('click', (e) => {
            const accountItem = e.target.closest('.account-item');
            const accountId = accountItem.dataset.accountId;
            
            if (!accountId) return;
            
            // Handle transfer button click
            if (e.target.classList.contains(CLASS.TRANSFER_BUTTON)) {
                window.location.href = `./transfer.html?from=${accountId}`;
            }
            
            // Handle close button click (you can implement this functionality later)
            if (e.target.classList.contains(CLASS.CLOSE_BUTTON)) {
                // Add account closing functionality here
                console.log('Close account', accountId);
            }
            
            // Close the menu
            const menu = e.target.closest(`.${CLASS.ACTION_MENU}`);
            if (menu) {
                menu.classList.add(CLASS.HIDDEN);
            }
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest(`.${CLASS.ACCOUNT_ACTIONS}`)) {
            document.querySelectorAll(`.${CLASS.ACTION_MENU}`).forEach((menu) => {
                menu.classList.add(CLASS.HIDDEN);
            });
        }
    });
}

// Event Handlers
async function handleAddAccount() {
    // Check if user already has maximum number of accounts (3)
    if (state.userAccounts && state.userAccounts.length >= 3) {
        // Silently return without showing error
        return;
    }
    
    if (!DOM.modals.accountType) return;
    DOM.modals.accountType.classList.remove('hidden');
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
    // Only fetch user data once - it includes account data
    fetchUserData();
    
    // Initialize account type selection
    const account_type_radios = document.querySelectorAll('input[name="account_type"]');
    const proceed_account_type_button = document.getElementById('proceed_account_type_button');
    const account_type_modal = document.getElementById('account_type_modal');
    const selected_account_type_span = document.getElementById('selected_account_type');
    const confirmation_modal = document.getElementById('confirmation_modal');
    
    let selectedAccountType = null;

    if (account_type_radios) {
        account_type_radios.forEach((radio) => {
            radio.addEventListener('change', () => {
                selectedAccountType = radio.value;
                if (proceed_account_type_button) {
                    proceed_account_type_button.disabled = false;
                }
            });
        });
    }

    if (proceed_account_type_button) {
        proceed_account_type_button.addEventListener('click', () => {
            if (selectedAccountType && account_type_modal && selected_account_type_span && confirmation_modal) {
                account_type_modal.classList.add('hidden');
                selected_account_type_span.textContent = selectedAccountType;
                confirmation_modal.classList.remove('hidden');
            }
        });
    }

    // Initialize cancel account type button
    if (DOM.buttons.cancelAccountType) {
        DOM.buttons.cancelAccountType.addEventListener('click', () => {
            if (DOM.modals.accountType) {
                DOM.modals.accountType.classList.add(CLASS.HIDDEN);
                state.selectedAccountType = null;
                if (DOM.inputs.accountTypeRadios) {
                    DOM.inputs.accountTypeRadios.forEach((radio) => (radio.checked = false));
                }
                if (DOM.buttons.proceedAccountType) {
                    DOM.buttons.proceedAccountType.disabled = true;
                }
            }
        });
    }

    // Initialize confirmation checkbox
    if (DOM.inputs.confirmAddAccount && DOM.buttons.proceedAddAccount) {
        DOM.inputs.confirmAddAccount.addEventListener('change', () => {
            DOM.buttons.proceedAddAccount.disabled = !DOM.inputs.confirmAddAccount.checked;
        });
    }

    // Initialize proceed add account button
    if (DOM.buttons.proceedAddAccount) {
        DOM.buttons.proceedAddAccount.addEventListener('click', handleProceedAddAccount);
    }

    // Initialize cancel add account button
    if (DOM.buttons.cancelAddAccount && DOM.modals.confirmation && DOM.inputs.confirmAddAccount) {
        DOM.buttons.cancelAddAccount.addEventListener('click', () => {
            DOM.modals.confirmation.classList.add(CLASS.HIDDEN);
            DOM.inputs.confirmAddAccount.checked = false;
            if (DOM.buttons.proceedAddAccount) {
                DOM.buttons.proceedAddAccount.disabled = true;
            }
        });
    }

    // Initialize verify OTP button
    if (DOM.buttons.verifyOtp) {
        DOM.buttons.verifyOtp.addEventListener('click', handleVerifyOtp);
    }

    // Initialize cancel OTP button
    if (DOM.buttons.cancelOtp && DOM.modals.otp && DOM.inputs.otp) {
        DOM.buttons.cancelOtp.addEventListener('click', () => {
            DOM.modals.otp.classList.add(CLASS.HIDDEN);
            DOM.inputs.otp.value = '';
        });
    }
});

// Handle proceed add account
async function handleProceedAddAccount() {
    try {
        const phoneNumber = state.userData.phone_number;
        
        if (!phoneNumber) {
            showNotification(TEXT.PHONE_NUMBER_NOT_FOUND, CLASS.ERROR);
            return;
        }
        
        // Store selected account type in localStorage for later use
        localStorage.setItem(STORAGE_KEY.PENDING_ACCOUNT_TYPE, state.selectedAccountType);
        
        // Send OTP to user's phone number
        const response = await fetch(API.AUTH.SEND_OTP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                }),
        });

        const data = await response.json();

        if (data.success) {
            const confirmation_modal = document.getElementById('confirmation_modal');
            const otp_modal = document.getElementById('otp_modal');
            const otp_input = document.getElementById('otp_input');
            
            if (confirmation_modal) confirmation_modal.classList.add(CLASS.HIDDEN);
            if (otp_modal) otp_modal.classList.remove(CLASS.HIDDEN);
            if (otp_input) otp_input.value = '';
            
            showNotification(TEXT.OTP_SENT, CLASS.SUCCESS);
        } else {
            showNotification(data.error || TEXT.OTP_SEND_ERROR, CLASS.ERROR);
        }
    } catch (error) {
        showNotification(TEXT.OTP_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Handle verify OTP
async function handleVerifyOtp() {
    const otp_input = document.getElementById('otp_input');
    const otp = otp_input ? otp_input.value.trim() : '';

    if (!otp) {
        showNotification(TEXT.ENTER_OTP, CLASS.ERROR);
        return;
    }

    try {
        const phoneNumber = state.userData.phone_number;
        
        if (!phoneNumber) {
            showNotification(TEXT.PHONE_NUMBER_NOT_FOUND, CLASS.ERROR);
            return;
        }
        
        // First verify the OTP
        const verifyResponse = await fetch(API.AUTH.VERIFY_OTP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    otp: otp,
                    phone_number: phoneNumber
                }),
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
            // Get the account type from localStorage
            const accountType = localStorage.getItem(STORAGE_KEY.PENDING_ACCOUNT_TYPE);
            
            if (!accountType) {
                showNotification(TEXT.ACCOUNT_TYPE_NOT_FOUND, CLASS.ERROR);
                return;
            }
            
            // If OTP verification is successful, submit the add account request
            const createResponse = await fetch(API.USER.CREATE_ACCOUNT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        account_type: accountType,
                        verified: true
                    }),
            });

            const createData = await createResponse.json();

            if (createData.success) {
                const otp_modal = document.getElementById('otp_modal');
                if (otp_modal) otp_modal.classList.add(CLASS.HIDDEN);
                
                // Show processing/under review modal
                const processing_modal = document.getElementById('processing_modal');
                if (processing_modal) processing_modal.classList.remove(CLASS.HIDDEN);
                
                showNotification(TEXT.ACCOUNT_CREATED, CLASS.SUCCESS);
                
                // Clear the stored account type
                localStorage.removeItem(STORAGE_KEY.PENDING_ACCOUNT_TYPE);
                
                // Do NOT refresh account list, since account is not created yet
            } else {
                showNotification(createData.error || TEXT.ACCOUNT_ERROR, CLASS.ERROR);
            }
        } else {
            showNotification(verifyData.error || TEXT.INVALID_OTP, CLASS.ERROR);
        }
    } catch (error) {
        showNotification(TEXT.OTP_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Export functions for use in other files
window.handleLogout = handleLogout; 
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

// Fetch user data from API
async function fetchUserData() {
    try {
        // Use session_check.php instead of profile.php
        const response = await fetch(API.AUTH.SESSION_CHECK);
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
    // CSS Classes
    const CLASS = {
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
    };
    
    // Icons
    const ICON = {
        ELLIPSIS_H: 'fas fa-ellipsis-h'
    };
    
    // Currency
    const CURRENCY = {
        SYMBOL: '₱',
        LOCALE: 'en-US'
    };
    
    // Account Status
    const ACCOUNT_STATUS = {
        CLOSED: 'closed'
    };
    
    const accountItem = document.createElement('div');
    accountItem.classList.add(CLASS.ACCOUNT_ITEM);
    accountItem.dataset.accountId = account.id;

    // Format account_type for display
    const accountTypeDisplay = account.account_type 
        ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) 
        : 'Standard';
    
    accountItem.innerHTML = `
        <div class="${CLASS.ACCOUNT_INFO}">
            <div class="${CLASS.INFO_GROUP}">
                <span class="${CLASS.INFO_LABEL}">Account No.</span>
                <span class="${CLASS.INFO_VALUE}">${account.account_number}</span>
            </div>
            <div class="${CLASS.INFO_GROUP}">
                <span class="${CLASS.INFO_LABEL}">Type</span>
                <span class="${CLASS.ACCOUNT_TYPE_BADGE} ${account.account_type ? account.account_type.toLowerCase() : 'standard'}">${accountTypeDisplay}</span>
            </div>
            <div class="${CLASS.INFO_GROUP}">
                <span class="${CLASS.INFO_LABEL}">Balance</span>
                <span class="${CLASS.INFO_VALUE}">${CURRENCY.SYMBOL} ${parseFloat(
                    account.balance
                ).toLocaleString(CURRENCY.LOCALE, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}</span>
            </div>
            <div class="${CLASS.INFO_GROUP}">
                <span class="${CLASS.INFO_LABEL}">Status</span>
                <span class="${CLASS.INFO_VALUE} ${CLASS.ACCOUNT_STATUS} ${account.status.toLowerCase()}">${
        account.status
    }</span>
            </div>
        </div>
        <div class="${CLASS.ACCOUNT_ACTIONS}">
            <button class="${CLASS.THREE_DOTS_BUTTON}" ${
                account.status === ACCOUNT_STATUS.CLOSED ? 'disabled' : ''
            }>
                <i class="${ICON.ELLIPSIS_H}"></i>
            </button>
            <div class="${CLASS.ACTION_MENU} ${CLASS.HIDDEN}">
                <button class="${CLASS.MENU_ITEM} ${CLASS.TRANSFER_BUTTON}">Transfer</button>
                <button class="${CLASS.MENU_ITEM} ${CLASS.CLOSE_BUTTON}">Close</button>
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
        HIDDEN: 'hidden'
    };
    
    document.querySelectorAll(`.${CLASS.THREE_DOTS_BUTTON}`).forEach((button) => {
        button.addEventListener('click', (e) => {
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

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest(`.${CLASS.ACCOUNT_ACTIONS}`)) {
            document.querySelectorAll(`.${CLASS.ACTION_MENU}`).forEach((menu) => {
                menu.classList.add(CLASS.HIDDEN);
            });
        }
    });
}

// Account Type Selection Handlers
account_type_radios.forEach((radio) => {
    radio.addEventListener('change', () => {
        selectedAccountType = radio.value;
        proceed_account_type_button.disabled = false;
    });
});

proceed_account_type_button.addEventListener('click', () => {
    // CSS Classes
    const CLASS = {
        HIDDEN: 'hidden'
    };
    
    if (selectedAccountType) {
        account_type_modal.classList.add(CLASS.HIDDEN);
        selected_account_type_span.textContent = selectedAccountType;
        confirmation_modal.classList.remove(CLASS.HIDDEN);
    }
});

cancel_account_type_button.addEventListener('click', () => {
    // CSS Classes
    const CLASS = {
        HIDDEN: 'hidden'
    };
    
    account_type_modal.classList.add(CLASS.HIDDEN);
    selectedAccountType = null;
    account_type_radios.forEach((radio) => (radio.checked = false));
    proceed_account_type_button.disabled = true;
});

// Confirmation Modal Handlers
confirm_add_account_checkbox.addEventListener('change', () => {
    proceed_add_account_button.disabled = !confirm_add_account_checkbox.checked;
});

proceed_add_account_button.addEventListener('click', async () => {
    try {
        // Text constants
        const TEXT = {
            PHONE_NUMBER_NOT_FOUND: 'Phone number not found in user profile',
            OTP_SENT: 'OTP sent successfully. Please verify to complete account creation.',
            OTP_SEND_ERROR: 'Failed to send OTP',
            OTP_ERROR: 'Error sending OTP'
        };
        
        // CSS class constants
        const CLASS = {
            HIDDEN: 'hidden',
            SUCCESS: 'success',
            ERROR: 'error'
        };
        
        // Local Storage Keys
        const STORAGE_KEY = {
            PENDING_ACCOUNT_TYPE: 'pending_account_type'
        };
        
        // Get the user's phone number from session data
        const phoneNumber = user_data.phone_number;
        
        if (!phoneNumber) {
            showNotification(TEXT.PHONE_NUMBER_NOT_FOUND, CLASS.ERROR);
            return;
        }
        
        // Store selected account type in localStorage for later use
        localStorage.setItem(STORAGE_KEY.PENDING_ACCOUNT_TYPE, selectedAccountType);
        
        // Send OTP to user's phone number
        const response = await fetch(
            API.AUTH.SEND_OTP,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                }),
            }
        );

        const data = await response.json();

        if (data.success) {
            confirmation_modal.classList.add(CLASS.HIDDEN);
            otp_modal.classList.remove(CLASS.HIDDEN);
            showNotification(TEXT.OTP_SENT, CLASS.SUCCESS);
            
            // Remove auto-filling of OTP
            if (otp_input) {
                otp_input.value = '';
            }
        } else {
            showNotification(data.error || TEXT.OTP_SEND_ERROR, CLASS.ERROR);
        }
    } catch (error) {
        // Text constants
        const TEXT = {
            OTP_ERROR: 'Error sending OTP'
        };
        
        // CSS class constants
        const CLASS = {
            ERROR: 'error'
        };
        
        showNotification(TEXT.OTP_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
});

cancel_add_account_button.addEventListener('click', () => {
    // CSS Classes
    const CLASS = {
        HIDDEN: 'hidden'
    };
    
    confirmation_modal.classList.add(CLASS.HIDDEN);
    confirm_add_account_checkbox.checked = false;
    proceed_add_account_button.disabled = true;
});

// OTP Verification Handlers
verify_otp_button.addEventListener('click', async () => {
    const otp = otp_input.value.trim();

    // Text constants
    const TEXT = {
        ENTER_OTP: 'Please enter OTP',
        PHONE_NUMBER_NOT_FOUND: 'Phone number not found in user profile',
        ACCOUNT_TYPE_NOT_FOUND: 'Account type not found. Please try again.',
        ACCOUNT_CREATED: 'Account created successfully',
        ACCOUNT_ERROR: 'Failed to create account',
        INVALID_OTP: 'Invalid OTP',
        OTP_ERROR: 'Error sending OTP'
    };
    
    // CSS class constants
    const CLASS = {
        HIDDEN: 'hidden',
        SUCCESS: 'success',
        ERROR: 'error'
    };
    
    // Local Storage Keys
    const STORAGE_KEY = {
        PENDING_ACCOUNT_TYPE: 'pending_account_type'
    };

    if (!otp) {
        showNotification(TEXT.ENTER_OTP, CLASS.ERROR);
        return;
    }

    try {
        // Get the phone number from user data
        const phoneNumber = user_data.phone_number;
        
        if (!phoneNumber) {
            showNotification(TEXT.PHONE_NUMBER_NOT_FOUND, CLASS.ERROR);
            return;
        }
        
        // First verify the OTP
        const verifyResponse = await fetch(
            API.AUTH.VERIFY_OTP,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    otp: otp,
                    phone_number: phoneNumber
                }),
            }
        );

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
            // Get the account type from localStorage
            const accountType = localStorage.getItem(STORAGE_KEY.PENDING_ACCOUNT_TYPE);
            
            if (!accountType) {
                showNotification(TEXT.ACCOUNT_TYPE_NOT_FOUND, CLASS.ERROR);
                return;
            }
            
            // If OTP verification is successful, create the account
            const createResponse = await fetch(
                API.USER.CREATE_ACCOUNT,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        account_type: accountType,
                        verified: true
                    }),
                }
            );

            const createData = await createResponse.json();

            if (createData.success) {
                otp_modal.classList.add(CLASS.HIDDEN);
                showNotification(TEXT.ACCOUNT_CREATED, CLASS.SUCCESS);
                
                // Clear the stored account type
                localStorage.removeItem(STORAGE_KEY.PENDING_ACCOUNT_TYPE);
                
                await fetchUserAccounts(); // Refresh account list
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
});

cancel_otp_button.addEventListener('click', () => {
    // CSS Classes
    const CLASS = {
        HIDDEN: 'hidden'
    };
    
    otp_modal.classList.add(CLASS.HIDDEN);
    otp_input.value = '';
});

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
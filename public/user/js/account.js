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
const account_list_container = document.querySelector('.account-list-container');
const notification_container = document.querySelector('.notification-container');
const account_type_modal = document.getElementById('account_type_modal');
const confirmation_modal = document.getElementById('confirmation_modal');
const otp_modal = document.getElementById('otp_modal');
const account_type_radios = document.querySelectorAll('input[name="account_type"]');
const proceed_account_type_button = document.getElementById('proceed_account_type_button');
const cancel_account_type_button = document.getElementById('cancel_account_type_button');
const confirm_add_account_checkbox = document.getElementById('confirm_add_account_checkbox');
const proceed_add_account_button = document.getElementById('proceed_add_account_button');
const cancel_add_account_button = document.getElementById('cancel_add_account_button');
const selected_account_type_span = document.getElementById('selected_account_type');
const otp_input = document.getElementById('otp_input');
const verify_otp_button = document.getElementById('verify_otp_button');
const cancel_otp_button = document.getElementById('cancel_otp_button');

// DOM Elements for Profile Edit
const user_avatar_container = document.getElementById('user_avatar_container');
const edit_profile_icon = document.getElementById('edit_profile_icon');
const edit_profile_modal = document.getElementById('edit_profile_modal');
const save_profile_button = document.getElementById('save_profile_button');
const exit_profile_button = document.getElementById('exit_profile_button');
const edit_first_name_input = document.getElementById('edit_first_name');
const edit_last_name_input = document.getElementById('edit_last_name');
const edit_username_input = document.getElementById('edit_username');
const edit_password_input = document.getElementById('edit_password');
const edit_confirm_password_input = document.getElementById('edit_confirm_password');
const edit_phone_number_input = document.getElementById('edit_phone_number');
const user_name_element = document.getElementById('user_name');
const welcome_user_name_element = document.getElementById('welcome_user_name');

// State
let selectedAccountType = null;
let userAccounts = [];
let user_data = {};

// Fetch user data from API
async function fetchUserData() {
    try {
        // Use session_check.php instead of profile.php
        const response = await fetch(API.AUTH.SESSION_CHECK);
        const data = await response.json();

        if (data.success && data.authenticated) {
            user_data = data.user;
            if (user_name_element) {
                user_name_element.textContent = `${user_data.first_name} ${user_data.last_name}`.trim();
            }
            if (welcome_user_name_element) {
                welcome_user_name_element.textContent = user_data.first_name;
            }
            display_user_initial(); // Update the initial
        } else {
            // Text constants
            const TEXT = {
                SESSION_EXPIRED: 'Session expired or invalid',
                USER_DATA_ERROR: 'Error fetching user data'
            };
            
            // CSS class constants
            const CLASS = {
                ERROR: 'error'
            };
            
            // Timing constants
            const TIMING = {
                REDIRECT_DELAY: 2000
            };
            
            showNotification(data.error || TEXT.SESSION_EXPIRED, CLASS.ERROR);
            // Redirect to login page if not authenticated
            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, TIMING.REDIRECT_DELAY);
        }
    } catch (error) {
        const TEXT = {
            USER_DATA_ERROR: 'Error fetching user data'
        };
        
        const CLASS = {
            ERROR: 'error'
        };
        
        showNotification(TEXT.USER_DATA_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Fetch user accounts from API
async function fetchUserAccounts() {
    try {
        const response = await fetch(API.USER.ACCOUNTS);
        const data = await response.json();

        // Debug log to see what accounts data we have
        console.log('User accounts data:', data.accounts);

        if (data.success) {
            userAccounts = data.accounts;
            updateAccountDisplay();
        } else {
            // Text constants
            const TEXT = {
                FETCH_ACCOUNTS_ERROR: 'Failed to fetch accounts',
                ACCOUNTS_ERROR: 'Error fetching accounts'
            };
            
            // CSS class constants
            const CLASS = {
                ERROR: 'error'
            };
            
            showNotification(data.error || TEXT.FETCH_ACCOUNTS_ERROR, CLASS.ERROR);
        }
    } catch (error) {
        const TEXT = {
            ACCOUNTS_ERROR: 'Error fetching accounts'
        };
        
        const CLASS = {
            ERROR: 'error'
        };
        
        showNotification(TEXT.ACCOUNTS_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Update account display
function updateAccountDisplay() {
    if (!account_list_container) return;

    account_list_container.innerHTML = '';

    // Display existing accounts
    userAccounts.forEach((account) => {
        const accountItem = createAccountItem(account);
        account_list_container.appendChild(accountItem);
    });

    // Add "Add Account" placeholder if under limit
    // Account Limits
    const ACCOUNT_LIMITS = {
        MAX_ACCOUNTS: 3
    };
    
    // CSS Classes
    const CLASS = {
        ADD_ACCOUNT_PLACEHOLDER: 'add-account-placeholder',
        HIDDEN: 'hidden'
    };
    
    // Icons
    const ICON = {
        PLUS: 'fas fa-plus'
    };
    
    // Text
    const TEXT = {
        ADD_NEW_ACCOUNT: 'Add New Account'
    };
    
    if (userAccounts.length < ACCOUNT_LIMITS.MAX_ACCOUNTS) {
        const addAccountPlaceholder = document.createElement('div');
        addAccountPlaceholder.classList.add(CLASS.ADD_ACCOUNT_PLACEHOLDER);
        addAccountPlaceholder.innerHTML = `
            <i class="${ICON.PLUS}"></i>
            <span>${TEXT.ADD_NEW_ACCOUNT}</span>
        `;
        addAccountPlaceholder.addEventListener('click', () => {
            account_type_modal.classList.remove(CLASS.HIDDEN);
        });
        account_list_container.appendChild(addAccountPlaceholder);
    }

    // Re-attach event listeners
    attachAccountItemListeners();
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
function showNotification(message, type) {
    // CSS Classes
    const CLASS = {
        NOTIFICATION: 'notification',
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info'
    };
    
    // Icons
    const ICON = {
        CHECK_CIRCLE: 'fas fa-check-circle',
        TIMES_CIRCLE: 'fas fa-times-circle',
        INFO_CIRCLE: 'fas fa-info-circle',
        BELL: 'fas fa-bell'
    };
    
    // Timing
    const TIMING = {
        NOTIFICATION_DURATION: 3000
    };
    
    const notification = document.createElement('div');
    notification.classList.add(CLASS.NOTIFICATION, type);

    let icon = '';
    switch (type) {
        case CLASS.SUCCESS:
            icon = ICON.CHECK_CIRCLE;
            break;
        case CLASS.ERROR:
            icon = ICON.TIMES_CIRCLE;
            break;
        case CLASS.INFO:
            icon = ICON.INFO_CIRCLE;
            break;
        default:
            icon = ICON.BELL;
    }

    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    notification_container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, TIMING.NOTIFICATION_DURATION);
}

// Function to display user initial in the avatar circle
function display_user_initial() {
    if (!user_avatar_container) return;
    
    // Use first_name and last_name directly from user_data
    const userName = user_data.first_name && user_data.last_name 
        ? `${user_data.first_name} ${user_data.last_name}`.trim() 
        : (user_name_element ? user_name_element.textContent.trim() : 'User');
    
    const initial = userName.charAt(0).toUpperCase();
    user_avatar_container.textContent = initial;
}

// Function to setup profile edit interactions
function setup_profile_edit() {
    if (
        !user_avatar_container ||
        !edit_profile_icon ||
        !edit_profile_modal ||
        !save_profile_button ||
        !exit_profile_button
    )
        return;

    // CSS Classes
    const CLASS = {
        HIDDEN: 'hidden'
    };

    // Show pen icon on hover
    user_avatar_container.addEventListener('mouseenter', () => {
        edit_profile_icon.classList.remove(CLASS.HIDDEN);
    });

    // Hide pen icon when not hovering over avatar or icon
    user_avatar_container.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (!edit_profile_icon.matches(':hover')) {
                edit_profile_icon.classList.add(CLASS.HIDDEN);
            }
        }, 50);
    });

    edit_profile_icon.addEventListener('mouseenter', () => {
        edit_profile_icon.classList.remove(CLASS.HIDDEN);
    });

    edit_profile_icon.addEventListener('mouseleave', () => {
        edit_profile_icon.classList.add(CLASS.HIDDEN);
    });

    // Show modal on pen icon click
    edit_profile_icon.addEventListener('click', () => {
        populate_profile_form();
        edit_profile_modal.classList.remove(CLASS.HIDDEN);
    });

    // Close modal on Exit button click
    exit_profile_button.addEventListener('click', () => {
        edit_profile_modal.classList.add(CLASS.HIDDEN);
    });

    // Handle Save button click
    save_profile_button.addEventListener('click', async () => {
        const updated_profile_data = {
            first_name: edit_first_name_input.value.trim(),
            last_name: edit_last_name_input.value.trim(),
            username: edit_username_input.value.trim(),
            password: edit_password_input.value, // Only include if not empty
            confirm_password: edit_confirm_password_input.value,
            phone_number: edit_phone_number_input.value.trim(),
        };
        
        // Text constants
        const TEXT = {
            FIRST_NAME_REQUIRED: 'First name and last name are required',
            PASSWORD_MISMATCH: 'Passwords do not match',
            PROFILE_UPDATED: 'Profile updated successfully!',
            PROFILE_UPDATE_ERROR: 'Failed to update profile',
            PROFILE_ERROR: 'Error updating profile'
        };
        
        // CSS class constants
        const CLASS = {
            HIDDEN: 'hidden',
            SUCCESS: 'success',
            ERROR: 'error'
        };
        
        // Basic validation
        if (!updated_profile_data.first_name || !updated_profile_data.last_name) {
            showNotification(TEXT.FIRST_NAME_REQUIRED, CLASS.ERROR);
            return;
        }
        
        // Only include password if it's not empty
        if (!updated_profile_data.password) {
            delete updated_profile_data.password;
            delete updated_profile_data.confirm_password;
        } else if (updated_profile_data.password !== updated_profile_data.confirm_password) {
            showNotification(TEXT.PASSWORD_MISMATCH, CLASS.ERROR);
            return;
        }

        try {
            // Send update to API
            const response = await fetch(API.USER.UPDATE_PROFILE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updated_profile_data)
            });

            const data = await response.json();

            if (data.success) {
                // Update local user data
                user_data.first_name = updated_profile_data.first_name;
                user_data.last_name = updated_profile_data.last_name;
                user_data.username = updated_profile_data.username;
                user_data.phone_number = updated_profile_data.phone_number;
                
                // Update UI
                if (user_name_element) {
                    user_name_element.textContent = `${user_data.first_name} ${user_data.last_name}`.trim();
                }
                display_user_initial();
                
                showNotification(TEXT.PROFILE_UPDATED, CLASS.SUCCESS);
                edit_profile_modal.classList.add(CLASS.HIDDEN);
            } else {
                showNotification(data.error || TEXT.PROFILE_UPDATE_ERROR, CLASS.ERROR);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(TEXT.PROFILE_ERROR, CLASS.ERROR);
        }
    });

    // Close modal when clicking outside
    edit_profile_modal.addEventListener('click', (event) => {
        if (event.target === edit_profile_modal) {
            edit_profile_modal.classList.add(CLASS.HIDDEN);
        }
    });
}

// Function to populate the profile edit form
function populate_profile_form() {
    if (
        !edit_first_name_input ||
        !edit_last_name_input ||
        !edit_username_input ||
        !edit_password_input ||
        !edit_confirm_password_input ||
        !edit_phone_number_input
    )
        return;

    edit_first_name_input.value = user_data.first_name || '';
    edit_last_name_input.value = user_data.last_name || '';
    edit_username_input.value = user_data.username || '';
    // Clear password fields for security
    edit_password_input.value = '';
    edit_confirm_password_input.value = '';
    edit_phone_number_input.value = user_data.phone_number || '';
}

// Initial fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchUserData();
    fetchUserAccounts();
    setup_profile_edit();
    
    // Text constants
    const TEXT = {
        INITIALIZE_MESSAGE: 'StackOvercash Account Page Initialized Dynamically!'
    };
    
    console.log(TEXT.INITIALIZE_MESSAGE);
});

// Function to handle logout
async function handleLogout() {
    try {
        // Clear relevant items from localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('account'); // Assuming account data is also stored
        localStorage.removeItem('token'); // If you are using tokens

        // Call backend logout API
        await fetch(API.AUTH.LOGOUT, { 
            method: 'POST',
            credentials: 'same-origin'
        });

        // Redirect to login page after successful logout
        window.location.href = './index.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // Show a notification that logout might not have been clean
        showNotification('Logout might not have been fully successful', 'warning');
        // Redirect anyway after a short delay
        setTimeout(() => {
            window.location.href = './index.html';
        }, 1500);
    }
}

// Event listener for logout button
const logout_btn = document.getElementById('logout_btn');
if (logout_btn) {
    logout_btn.addEventListener('click', (event) => {
        // Prevent the default navigation to ensure our handleLogout function completes
        event.preventDefault(); 
        handleLogout();
    });
}

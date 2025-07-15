// DOM Elements
const DOM = {
    accountList: document.querySelector('.account-list-container'),
    notification: document.querySelector('.notification-container'),
    modals: {
        accountType: document.getElementById('account_type_modal'),
        confirmation: document.getElementById('confirmation_modal'),
        otp: document.getElementById('otp_modal'),
        processing: document.getElementById('processing_modal'),
        editProfile: document.getElementById('edit_profile_modal'),
    },
    buttons: {
        proceedAccountType: document.getElementById(
            'proceed_account_type_button'
        ),
        cancelAccountType: document.getElementById(
            'cancel_account_type_button'
        ),
        proceedAddAccount: document.getElementById(
            'proceed_add_account_button'
        ),
        cancelAddAccount: document.getElementById('cancel_add_account_button'),
        verifyOtp: document.getElementById('verify_otp_button'),
        cancelOtp: document.getElementById('cancel_otp_button'),
        closeProcessing: document.getElementById('close_processing_button'),
        saveProfile: document.getElementById('save_profile_button'),
        exitProfile: document.getElementById('exit_profile_button'),
        editProfile: document.getElementById('edit_profile_icon'),
    },
    inputs: {
        accountTypeRadios: document.querySelectorAll(
            'input[name="account_type"]'
        ),
        confirmAddAccount: document.getElementById(
            'confirm_add_account_checkbox'
        ),
        otp: document.getElementById('otp_input'),
        editFirstName: document.getElementById('edit_first_name'),
        editLastName: document.getElementById('edit_last_name'),
        editUsername: document.getElementById('edit_username'),
        editPassword: document.getElementById('edit_password'),
        editConfirmPassword: document.getElementById('edit_confirm_password'),
        editPhoneNumber: document.getElementById('edit_phone_number'),
    },
    displays: {
        selectedAccountType: document.getElementById('selected_account_type'),
        userName: document.getElementById('user_name'),
        welcomeUserName: document.getElementById('welcome_user_name'),
        userAvatar: document.getElementById('user_avatar_container'),
    },
};

// State
const state = {
    selectedAccountType: null,
    userAccounts: [],
    userData: {},
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
        HIDDEN: 'hidden',
    },
    ICON: {
        ELLIPSIS_H: 'fas fa-ellipsis-h',
    },
    CURRENCY: {
        SYMBOL: '₱',
        LOCALE: 'en-US',
    },
    STATUS: {
        CLOSED: 'closed',
    },
};

// Constants
const CLASS = {
    HIDDEN: 'hidden',
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

const TEXT = {
    PHONE_NUMBER_NOT_FOUND:
        'Your phone number is not available. Please update your profile.',
    OTP_SENT: 'An OTP has been sent to your phone number.',
    OTP_SEND_ERROR: 'Failed to send OTP. Please try again later.',
    INVALID_OTP: 'The OTP you entered is incorrect.',
    ACCOUNT_TYPE_NOT_FOUND: 'Account type not found. Please try again.',
    ACCOUNT_CREATED:
        'Your request for a new account has been submitted for review.',
    ACCOUNT_ERROR: 'Failed to create account. Please try again.',
    FETCH_ACCOUNTS_ERROR: 'Could not load your accounts.',
    SESSION_EXPIRED: 'Session has expired. Please login again.',
    USER_DATA_ERROR: 'Error fetching user data',
    ACCOUNTS_ERROR: 'Error loading accounts',
    LOGOUT_SUCCESS: 'Successfully logged out',
    LOGOUT_ERROR: 'Error logging out',
};

const STORAGE_KEY = {
    PENDING_ACCOUNT_TYPE: 'pending_account_type',
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

// Update user display elements
function updateUserDisplay() {
    if (DOM.displays.userName) {
        DOM.displays.userName.textContent =
            `${state.userData.first_name} ${state.userData.last_name}`.trim();
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
        const response = await fetch(API_ENDPOINTS.USER.ACCOUNTS);
        const data = await response.json();

        if (data.success && data.accounts) {
            state.userAccounts = data.accounts;
            updateAccountDisplay();
        } else {
            console.error('Error fetching accounts:', data.error);
            showNotification(data.error || TEXT.ACCOUNTS_ERROR, CLASS.ERROR);
        }
    } catch (error) {
        console.error('Error fetching user accounts:', error);
        showNotification(TEXT.FETCH_ACCOUNTS_ERROR, CLASS.ERROR);
    }
}

// Update account display
function updateAccountDisplay() {
    if (!DOM.accountList) {
        console.error('Account list container not found');
        return;
    }

    DOM.accountList.innerHTML = '';

    // Display existing accounts
    if (state.userAccounts && state.userAccounts.length > 0) {
        state.userAccounts.forEach((account) => {
            const accountItem = createAccountItem(account);
            DOM.accountList.appendChild(accountItem);
        });
    }

    // Add "Add Account" card only if user has fewer than 3 accounts
    if (Array.isArray(state.userAccounts) && state.userAccounts.length < 3) {
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
    const accountItem = document.createElement('div');
    accountItem.classList.add(ACCOUNT_UI.CLASS.ACCOUNT_ITEM);
    accountItem.dataset.accountId = account.account_id || account.id || '';
    const accountType = account.type || account.account_type || 'savings';
    const accountTypeDisplay =
        accountType.charAt(0).toUpperCase() + accountType.slice(1);
    // Use Font Awesome icon for badge
    let typeIcon = '';
    if (accountType.toLowerCase() === 'savings') {
        typeIcon = `<i class='fas fa-piggy-bank account-type-icon-savings'></i>`;
    } else if (accountType.toLowerCase() === 'credit') {
        typeIcon = `<i class='fas fa-credit-card account-type-icon-credit'></i>`;
    }
    accountItem.innerHTML = `
        <div class="${ACCOUNT_UI.CLASS.ACCOUNT_INFO}">
            <div class="${ACCOUNT_UI.CLASS.INFO_GROUP}">
                <span class="${ACCOUNT_UI.CLASS.INFO_LABEL}">Account No.</span>
                <span class="${ACCOUNT_UI.CLASS.INFO_VALUE}">${
        account.account_number || ''
    }</span>
            </div>
            <div class="${ACCOUNT_UI.CLASS.INFO_GROUP}">
                <span class="${ACCOUNT_UI.CLASS.INFO_LABEL}">Type</span>
                <span class="${
                    ACCOUNT_UI.CLASS.ACCOUNT_TYPE_BADGE
                } ${accountType.toLowerCase()}">${typeIcon}${accountTypeDisplay}</span>
            </div>
            <div class="${ACCOUNT_UI.CLASS.INFO_GROUP}">
                <span class="${ACCOUNT_UI.CLASS.INFO_LABEL}">Balance</span>
                <span class="${ACCOUNT_UI.CLASS.INFO_VALUE}">${
        ACCOUNT_UI.CURRENCY.SYMBOL
    } ${parseFloat(account.balance || 0).toLocaleString(
        ACCOUNT_UI.CURRENCY.LOCALE,
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    )}</span>
            </div>
            <div class="${ACCOUNT_UI.CLASS.INFO_GROUP}">
                <span class="${ACCOUNT_UI.CLASS.INFO_LABEL}">Status</span>
                <span class="${ACCOUNT_UI.CLASS.INFO_VALUE} ${
        ACCOUNT_UI.CLASS.ACCOUNT_STATUS
    } ${(account.status || 'active').toLowerCase()}">${
        account.status || 'Active'
    }</span>
            </div>
        </div>
        <div class="${ACCOUNT_UI.CLASS.ACCOUNT_ACTIONS}">
            <button class="${ACCOUNT_UI.CLASS.THREE_DOTS_BUTTON}" ${
        (account.status || '').toLowerCase() === ACCOUNT_UI.STATUS.CLOSED
            ? 'disabled'
            : ''
    }>
                <i class="${ACCOUNT_UI.ICON.ELLIPSIS_H}"></i>
            </button>
            <div class="${ACCOUNT_UI.CLASS.ACTION_MENU} ${
        ACCOUNT_UI.CLASS.HIDDEN
    }">
                <button class="${ACCOUNT_UI.CLASS.MENU_ITEM} ${
        ACCOUNT_UI.CLASS.TRANSFER_BUTTON
    }">Transfer</button>
                <button class="${ACCOUNT_UI.CLASS.MENU_ITEM} ${
        ACCOUNT_UI.CLASS.CLOSE_BUTTON
    }">Close</button>
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
        MENU_ITEM: 'menu-item',
    };

    // Handle three dots menu button
    document
        .querySelectorAll(`.${CLASS.THREE_DOTS_BUTTON}`)
        .forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = e.target
                    .closest(`.${CLASS.ACCOUNT_ACTIONS}`)
                    .querySelector(`.${CLASS.ACTION_MENU}`);
                const allMenus = document.querySelectorAll(
                    `.${CLASS.ACTION_MENU}`
                );

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
            document
                .querySelectorAll(`.${CLASS.ACTION_MENU}`)
                .forEach((menu) => {
                    menu.classList.add(CLASS.HIDDEN);
                });
        }
    });
}

// Event Handlers
async function handleAddAccount() {
    if (state.userAccounts && state.userAccounts.length >= 3) {
        return;
    }
    DOM.modals.accountType.classList.remove('hidden');
}

function attachEventListeners() {
    DOM.inputs.accountTypeRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            state.selectedAccountType = e.target.value;
            DOM.buttons.proceedAccountType.disabled = false;
        });
    });

    DOM.buttons.proceedAccountType.addEventListener('click', () => {
        sessionStorage.setItem(
            STORAGE_KEY.PENDING_ACCOUNT_TYPE,
            state.selectedAccountType
        );
        DOM.modals.accountType.classList.add('hidden');
        DOM.modals.confirmation.classList.remove('hidden');
        DOM.displays.selectedAccountType.textContent =
            state.selectedAccountType;
    });

    DOM.buttons.cancelAccountType.addEventListener('click', () => {
        DOM.modals.accountType.classList.add('hidden');
        DOM.buttons.proceedAccountType.disabled = true;
        DOM.inputs.accountTypeRadios.forEach((r) => (r.checked = false));
    });

    DOM.inputs.confirmAddAccount.addEventListener('change', (e) => {
        DOM.buttons.proceedAddAccount.disabled = !e.target.checked;
    });

    DOM.buttons.proceedAddAccount.addEventListener(
        'click',
        handleProceedAddAccount
    );

    DOM.buttons.cancelAddAccount.addEventListener('click', () => {
        DOM.modals.confirmation.classList.add('hidden');
        DOM.inputs.confirmAddAccount.checked = false;
        DOM.buttons.proceedAddAccount.disabled = true;
    });

    DOM.buttons.verifyOtp.addEventListener('click', handleVerifyOtp);

    DOM.buttons.cancelOtp.addEventListener('click', () => {
        DOM.modals.otp.classList.add('hidden');
    });
}

function init() {
    const storedUserData = sessionStorage.getItem('userData');
    if (storedUserData) {
        state.userData = JSON.parse(storedUserData);
    }
    fetchUserAccounts();
    attachEventListeners();
}

document.addEventListener('DOMContentLoaded', function () {
    init();

    // --- MOBILE/TABLET TOPNAV DROPDOWN LOGIC (copied from dashboard) ---
    const hamburgerBtn = document.getElementById('hamburger_btn');
    const topnavDropdown = document.getElementById('topnav_dropdown');
    const logoutBtnMobile = document.getElementById('logout_btn_mobile');

    if (hamburgerBtn && topnavDropdown) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 1024) {
                topnavDropdown.classList.toggle('open');
            }
        });
        // Close dropdown when clicking a nav link or logout
        topnavDropdown
            .querySelectorAll('.nav-link, .logout-btn')
            .forEach((el) => {
                el.addEventListener('click', () => {
                    topnavDropdown.classList.remove('open');
                });
            });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (
                topnavDropdown.classList.contains('open') &&
                !topnavDropdown.contains(e.target) &&
                e.target !== hamburgerBtn
            ) {
                topnavDropdown.classList.remove('open');
            }
        });
    }
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', (event) => {
            event.preventDefault();
            handleLogout();
        });
    }
});

// Handle proceed add account
async function handleProceedAddAccount() {
    const phoneNumber = state.userData.phone_number;
    if (!phoneNumber) {
        showNotification(TEXT.PHONE_NUMBER_NOT_FOUND, CLASS.ERROR);
        return;
    }

    try {
        const response = await fetch(API_ENDPOINTS.AUTH.SEND_OTP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone_number: phoneNumber,
                purpose: 'create_account',
            }),
        });
        const data = await response.json();
        if (data.success) {
            DOM.modals.confirmation.classList.add(CLASS.HIDDEN);
            DOM.modals.otp.classList.remove(CLASS.HIDDEN);
            showNotification(TEXT.OTP_SENT, CLASS.SUCCESS);
        } else {
            console.error('OTP send error:', data.error);
            showNotification(data.error || TEXT.OTP_SEND_ERROR, CLASS.ERROR);
        }
    } catch (error) {
        showNotification(TEXT.OTP_SEND_ERROR, CLASS.ERROR);
    }
}

// Handle verify OTP
async function handleVerifyOtp() {
    const otp = DOM.inputs.otp.value;
    const accountType = sessionStorage.getItem(
        STORAGE_KEY.PENDING_ACCOUNT_TYPE
    );

    if (!otp || !accountType) {
        showNotification('OTP and account type are required.', CLASS.ERROR);
        return;
    }

    DOM.modals.processing.classList.remove(CLASS.HIDDEN);
    try {
        const verifyResponse = await fetch(API_ENDPOINTS.AUTH.VERIFY_OTP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                otp,
                phone_number: state.userData.phone_number,
                purpose: 'create_account',
            }),
        });
        const verifyData = await verifyResponse.json();

        if (DOM.buttons.verifyOtp) {
            DOM.buttons.verifyOtp.disabled = false;
            DOM.buttons.verifyOtp.textContent = 'Verify';
        }

        if (verifyData.success) {
            const createResponse = await fetch(
                API_ENDPOINTS.USER.CREATE_ADDITIONAL_ACCOUNT,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account_type: accountType }),
                }
            );
            const createData = await createResponse.json();
            if (createData.success) {
                showNotification(
                    createData.message || TEXT.ACCOUNT_CREATED,
                    CLASS.SUCCESS
                );
                fetchUserAccounts();
            } else {
                console.error('Create account error:', createData.error);
                showNotification(
                    createData.error || TEXT.ACCOUNT_ERROR,
                    CLASS.ERROR
                );
            }
        } else {
            console.error('OTP verification error:', verifyData.error);
            showNotification(verifyData.error || TEXT.INVALID_OTP, CLASS.ERROR);
        }
    } catch (error) {
        console.error('Error in handleVerifyOtp:', error);
        showNotification('An unexpected error occurred.', CLASS.ERROR);
    } finally {
        DOM.modals.otp.classList.add(CLASS.HIDDEN);
        DOM.modals.processing.classList.add(CLASS.HIDDEN);
        sessionStorage.removeItem(STORAGE_KEY.PENDING_ACCOUNT_TYPE);
    }
}

const CURRENCY = {
    SYMBOL: '₱',
    LOCALE: 'en-PH',
};

// Timing (in milliseconds)
const TIMING = {
    NOTIFICATION_DURATION: 3000,
    REDIRECT_DELAY: 2000,
    ANIMATION_DELAY: 300,
    REFRESH_INTERVAL: 30000, // Add refresh interval (30 seconds)
};

// Account Status
const ACCOUNT_STATUS = {
    ACTIVE: 'active',
};

// Financial Tips
const FINANCIAL_TIPS = [
    {
        title: 'Save for Emergencies',
        content:
            'Try to save at least 3-6 months of living expenses for unexpected events.',
        icon: 'fa-piggy-bank',
    },
    {
        title: 'Track Your Spending',
        content:
            'Keep a record of all expenses to understand your spending habits better.',
        icon: 'fa-chart-line',
    },
    {
        title: 'Budget Wisely',
        content: 'Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings.',
        icon: 'fa-wallet',
    },
    {
        title: 'Invest for the Future',
        content:
            'Consider investing in diverse portfolios for long-term growth.',
        icon: 'fa-chart-pie',
    },
    {
        title: 'Avoid Unnecessary Debt',
        content:
            'Use credit cards responsibly and pay full balances when possible.',
        icon: 'fa-credit-card',
    },
];

// DOM Elements
let nav_links;
let logout_btn;
let notification_btn;
let add_btn;
let help_btn;
let transfer_now_btn;
let account_balance_element;
let transaction_list_element;
let user_name_element;
let user_avatar_container;
let profile_edit_modal;
let dropdownTrigger;
let dropdownList;
let dropdownArrow;
let dropdownEye;
let dropdownType;
let dropdownNumber;
let dropdownBalance;

// State
let user_data = {};
let user_accounts = [];
let accountNumbersMasked = true;

// Initialize session manager
const sessionManager = new SessionManager({
    onTimeout: () => {
        show_notification(
            'Your session has expired. Redirecting to login...',
            'warning'
        );
        setTimeout(() => {
            window.location.href = ROUTES.LOGIN;
        }, 2000);
    },
    onWarning: (timeLeft) => {
        show_notification(
            `Your session will expire in ${Math.round(
                timeLeft / 60
            )} minutes. Please save your work.`,
            'warning'
        );
    },
});

function show_notification(message, type) {
    const notification_container = document.querySelector(
        '.notification-container'
    );
    if (!notification_container) return;

    const notification = document.createElement('div');
    notification.classList.add('notification', type);

    // Icons for different notification types
    const ICON = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-circle',
        default: 'fas fa-bell',
    };

    let icon_class = ICON[type] || ICON.default;

    notification.innerHTML = `<i class="${icon_class}"></i> <span>${message}</span>`;
    notification_container.appendChild(notification);

    // Automatically remove the notification after a few seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize DOM elements
function initializeDOMElements() {
    nav_links = document.querySelectorAll('.nav-link');
    logout_btn = document.getElementById('logout_btn');
    notification_btn = document.getElementById('notification_btn');
    add_btn = document.getElementById('add_btn');
    help_btn = document.getElementById('help_btn');
    transfer_now_btn = document.getElementById('transfer_now_btn');
    account_balance_element = document.getElementById('account_balance');
    transaction_list_element = document.getElementById('transaction_list');
    user_name_element = document.getElementById('user_name');
    user_avatar_container = document.getElementById('user_avatar_container');
    profile_edit_modal = document.getElementById('edit_profile_modal');
    // New dropdown/eye elements
    dropdownTrigger = document.getElementById('account-dropdown-trigger');
    dropdownList = document.getElementById('account-dropdown-list');
    dropdownArrow = document.getElementById('account-dropdown-arrow');
    dropdownEye = document.getElementById('dashboard_account_eye');
    dropdownType = document.getElementById('dashboard_account_type');
    dropdownNumber = document.getElementById('dashboard_account_number');
    dropdownBalance = document.getElementById('account_balance');
    // Only require the new dropdown elements and balance
    if (
        !dropdownTrigger ||
        !dropdownList ||
        !dropdownArrow ||
        !dropdownEye ||
        !dropdownType ||
        !dropdownNumber ||
        !dropdownBalance
    ) {
        console.error('Required DOM elements not found');
        return false;
    }
    return true;
}

// Utility function to mask account number
function maskAccountNumber(accountNumber) {
    if (!accountNumber) return '';
    const visible = accountNumber.slice(-4);
    const masked = 'x'.repeat(accountNumber.length - 4);
    return masked + visible;
}

// Store mask state per account
let accountMaskState = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Declare all shared DOM variables ONCE
    const hamburgerBtn = document.getElementById('hamburger_btn');
    const topnavDropdown = document.getElementById('topnav_dropdown');
    const sidebar = document.getElementById('sidebar_nav');
    const closeSidebarBtn = document.getElementById('close_sidebar_btn');
    const sidebarOverlay = document.getElementById('sidebar_overlay');
    const navLinks = document.querySelectorAll('.nav-link');

    // --- MOBILE/TABLET TOPNAV DROPDOWN LOGIC ---
    if (hamburgerBtn && topnavDropdown) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Only toggle dropdown if sidebar is hidden (mobile/tablet)
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
    // Sidebar logic for desktop only
    function openSidebar() {
        if (window.innerWidth > 1024) {
            sidebar.classList.add('open');
            sidebarOverlay.style.display = 'block';
            document.body.classList.add('sidebar-open');
            closeSidebarBtn.style.display = 'flex';
            setTimeout(() => {
                if (navLinks[0]) navLinks[0].focus();
            }, 100);
        }
    }
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.style.display = 'none';
        document.body.classList.remove('sidebar-open');
        closeSidebarBtn.style.display = 'none';
    }
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', () => {
            if (window.innerWidth > 1024) openSidebar();
        });
    }
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth > 1024) closeSidebar();
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            closeSidebar();
        } else {
            if (topnavDropdown) topnavDropdown.classList.remove('open');
        }
    });
    init_dashboard().catch((error) => {
        console.error('Failed to initialize dashboard:', error);
        show_notification('Failed to initialize dashboard', 'error');
    });
    displayFinancialTip(); // Ensure tip is shown on load

    // --- MOBILE NOTICE + TIP FLEX ROW LOGIC ---
    function moveNoticeAndTipForMobile() {
        const notice = document.getElementById('notice_banner');
        const tip = document.getElementById('financial_tip_container');
        const mobileRow = document.getElementById('mobile_top_row');
        const rightSection = document.querySelector('.right-section');
        const dashboardContent = document.querySelector('.dashboard-content');
        const welcomeSection = document.querySelector('.welcome-section');
        const leftSection = document.querySelector('.left-section');
        if (
            !notice ||
            !tip ||
            !mobileRow ||
            !rightSection ||
            !dashboardContent ||
            !welcomeSection ||
            !leftSection
        )
            return;
        if (window.innerWidth <= 768) {
            if (!mobileRow.contains(notice)) mobileRow.appendChild(notice);
            if (!mobileRow.contains(tip)) mobileRow.appendChild(tip);
            if (!mobileRow.contains(welcomeSection))
                mobileRow.appendChild(welcomeSection);
            mobileRow.style.display = 'flex';
            mobileRow.style.flexDirection = 'column';
            mobileRow.classList.remove('hidden');
        } else {
            if (!rightSection.contains(tip))
                rightSection.insertBefore(tip, rightSection.firstChild);
            if (dashboardContent && !dashboardContent.contains(notice))
                dashboardContent.parentNode.insertBefore(
                    notice,
                    dashboardContent
                );
            if (!leftSection.contains(welcomeSection))
                leftSection.insertBefore(
                    welcomeSection,
                    leftSection.firstChild
                );
            mobileRow.style.display = 'none';
            mobileRow.classList.add('hidden');
        }
    }
    moveNoticeAndTipForMobile();
    window.addEventListener('resize', moveNoticeAndTipForMobile);
    const accountNumberEl = document.getElementById('dashboard_account_number');
    if (accountNumberEl) {
        accountNumberEl.style.cursor = 'pointer';
        accountNumberEl.title = 'Click to copy account number';
        accountNumberEl.addEventListener('click', function (e) {
            e.stopPropagation();
            // Find the selected account's full number
            let fullNumber = '';
            if (window.selectedAccountNumber) {
                fullNumber = window.selectedAccountNumber;
            } else if (user_accounts && user_accounts.length > 0) {
                fullNumber = user_accounts[0].account_number;
            }
            if (fullNumber) {
                // Copy to clipboard with fallback
                copyToClipboard(fullNumber)
                    .then(() => {
                        // Show success notification
                        show_notification(
                            'Account number copied to clipboard!',
                            'success'
                        );

                        // Add visual feedback to the account number element
                        accountNumberEl.classList.add('copied');
                        setTimeout(() => {
                            accountNumberEl.classList.remove('copied');
                        }, 1500);
                    })
                    .catch((err) => {
                        console.error('Failed to copy account number:', err);
                        show_notification(
                            'Failed to copy account number',
                            'error'
                        );
                    });
            }
        });
    }
});

// Update the fetchUserAccounts function
async function fetchUserAccounts() {
    if (!initializeDOMElements()) {
        console.error('DOM elements not initialized');
        return;
    }

    try {
        const response = await fetch(API_ENDPOINTS.USER.ACCOUNTS, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Accounts API Response:', data);

        // Store the accounts data from the accounts property
        user_accounts = data.accounts || [];
        console.log('Stored user accounts:', user_accounts);

        // Update the display
        updateAccountDisplay();

        return user_accounts;
    } catch (error) {
        console.error('Error fetching accounts:', error);
        updateAccountDisplay();
        throw error;
    }
}

// Update Account Display: only call setupAccountDropdown
function updateAccountDisplay() {
    if (!initializeDOMElements()) {
        console.error('Required DOM elements not initialized');
        return;
    }
    setupAccountDropdown(user_accounts, window.selectedAccountNumber);
}

// Add dropdown state management
function setupDropdownStateManagement() {
    document.addEventListener('click', (event) => {
        const dropdownContainer = document.querySelector('.dropdown-container');
        const accountControls = document.querySelector('.account-controls');

        if (
            dropdownContainer &&
            dropdownContainer.classList.contains('active')
        ) {
            // Check if click is outside dropdown and account controls
            if (
                !dropdownContainer.contains(event.target) &&
                !accountControls?.contains(event.target)
            ) {
                dropdownContainer.classList.remove('active');
                document.body.classList.remove('dropdown-open');
            }
        }
    });
}

// Initialize dashboard
async function init_dashboard() {
    try {
        // First check session
        const isAuthenticated = await checkSession();
        if (!isAuthenticated) {
            return;
        }

        // Debug log session check result
        console.log('Session check passed, initializing dashboard...');

        // Fetch initial data
        const [userData, accountsData] = await Promise.all([
            fetchUserData(),
            fetchUserAccounts(),
        ]).catch((error) => {
            console.error('Error fetching initial data:', error);
            throw error; // Re-throw to be caught by the outer try-catch
        });

        console.log('Fetched user data:', userData);
        console.log('Fetched accounts data:', accountsData);

        // Set up UI interactions
        setup_smooth_animations();
        setup_profile_edit();
        setupDropdownStateManagement();

        // Set up periodic data refresh
        setInterval(() => {
            checkSession().then((isValid) => {
                if (isValid) {
                    fetchUserAccounts();
                }
            });
        }, 30000); // Check every 30 seconds
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        show_notification('Error initializing dashboard', 'error');
    }
}

// Check session status
async function checkSession() {
    try {
        const response = await fetch(API_ENDPOINTS.AUTH.SESSION_CHECK, {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                show_notification(
                    'Session expired. Redirecting to login...',
                    'warning'
                );
                setTimeout(() => {
                    window.location.href = ROUTES.LOGIN;
                }, 2000);
            }
            return false;
        }

        const data = await response.json();
        console.log('Session check response:', data);

        if (!data.success || !data.authenticated) {
            show_notification(
                'Session expired. Redirecting to login...',
                'warning'
            );
            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, 2000);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Session check error:', error);
        return false;
    }
}

// Fetch user data from API
async function fetchUserData() {
    try {
        const response = await fetch(API_ENDPOINTS.AUTH.SESSION_CHECK, {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        });

        const data = await response.json();

        if (data.success && data.authenticated) {
            user_data = data.user; // Store user data in state
            // Update welcome message
            const welcome_user_name_element =
                document.getElementById('welcome_user_name');
            if (welcome_user_name_element) {
                welcome_user_name_element.textContent =
                    (user_data.first_name ? user_data.first_name : '') +
                    (user_data.last_name ? ' ' + user_data.last_name : '') +
                    '!';
            }

            display_user_initial(); // Update the initial
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        show_notification('Error loading user data', 'error');
    }
}

// Toggle account number masking
function toggleAccountNumberMask() {
    accountNumbersMasked = !accountNumbersMasked;

    // Update all account number displays
    const accountNumbers = document.querySelectorAll(`.account-number-text`);
    const options = document.querySelectorAll(
        '#dashboard_account_select option'
    );
    const toggleButtons = document.querySelectorAll(`.account-toggle-mask`);

    // Update the eye icon on all toggle buttons
    toggleButtons.forEach((btn) => {
        btn.innerHTML = `<i class="${
            accountNumbersMasked ? 'fas fa-eye' : 'fas fa-eye-slash'
        }"></i>`;
    });

    // Update account numbers in single display
    accountNumbers.forEach((element) => {
        const accountNumber = element.getAttribute('data-account-number');
        if (accountNumber) {
            element.textContent = maskAccountNumber(accountNumber);
        }
    });

    // Update account numbers in dropdown
    options.forEach((option) => {
        const accountNumber = option.value;
        option.textContent = maskAccountNumber(accountNumber);
    });
}

// Update Balance Display
function update_balance_display(balance) {
    if (dropdownBalance) {
        // Use dropdownBalance
        const formatted_balance = `₱ ${parseFloat(balance).toLocaleString(
            'en-US',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        )}`;
        dropdownBalance.textContent = formatted_balance; // Use dropdownBalance
    }
}

// Fetch recent transactions for the dashboard
async function fetchRecentTransactions(accountNumber) {
    try {
        // Get the current selected account number if not provided
        if (!accountNumber) {
            accountNumber = window.selectedAccountNumber;
        }

        if (!accountNumber) {
            // No account number available, show a message
            if (transaction_list_element) {
                transaction_list_element.innerHTML =
                    '<p class="no-transactions-message">Select an account to view transactions.</p>';
            }
            return;
        }

        // Update the API endpoint path with account filter
        const response = await fetch(
            `${API_ENDPOINTS.USER.TRANSACTIONS}?account=${accountNumber}&limit=2`
        );

        // Check if the response is OK before trying to parse JSON
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.transactions && data.transactions.length > 0) {
            // Clear existing transactions
            if (transaction_list_element) {
                transaction_list_element.innerHTML = '';

                // Get the transactions for the selected account
                const recentTransactions = data.transactions;

                // Create transaction elements
                recentTransactions.forEach((transaction) => {
                    const transactionItem = document.createElement('div');
                    transactionItem.classList.add('transaction-item');

                    // Determine transaction type for styling
                    const isDeposit =
                        transaction.type === 'deposit' ||
                        parseFloat(transaction.amount) >= 0 ||
                        (transaction.description &&
                            transaction.description
                                .toLowerCase()
                                .includes('deposit'));

                    const amountClass = isDeposit ? 'deposit' : 'withdrawal';

                    // Format the amount for display
                    const formattedAmount = Math.abs(
                        parseFloat(transaction.amount)
                    ).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });

                    // Format the date to be more user-friendly
                    let formattedDate = transaction.date;
                    try {
                        const dateObj = new Date(transaction.date);
                        formattedDate = dateObj.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        });
                    } catch (e) {
                        console.log('Date formatting error:', e);
                    }

                    transactionItem.innerHTML = `
                        <span class="transaction-date">${formattedDate}</span>
                        <span class="transaction-amount ${amountClass}">${
                        isDeposit ? '+' : '-'
                    }₱${formattedAmount}</span>
                    `;
                    transaction_list_element.appendChild(transactionItem);
                });
            }
        } else {
            // Handle case with no transactions
            if (transaction_list_element) {
                transaction_list_element.innerHTML =
                    '<p class="no-transactions-message">No recent transactions for this account.</p>';
            }
        }
    } catch (error) {
        console.log('Error fetching transactions:', error);
        if (transaction_list_element) {
            transaction_list_element.innerHTML =
                '<p class="no-transactions-message">Failed to load transactions.</p>';
        }
    }
}

// Function to display user initial in the avatar circle
function display_user_initial() {
    if (!user_avatar_container) return;

    // Use user_data fetched from API
    const userName =
        user_data.first_name && user_data.last_name
            ? `${user_data.first_name} ${user_data.last_name}`.trim()
            : user_name_element
            ? user_name_element.textContent.trim()
            : 'User';

    const initial = userName.charAt(0).toUpperCase();
    user_avatar_container.textContent = initial;
}
function setup_smooth_animations() {
    // Existing animation setup code
    console.log('Setting up smooth animations (placeholder)');
}

// Function to setup profile edit interactions (assuming modals and elements exist in user_dashboard.html)
function setup_profile_edit() {
    const userAvatarContainer = document.getElementById(
        'user_avatar_container'
    );
    const editProfileIcon = document.getElementById('edit_profile_icon');
    const profileEditModal = document.getElementById('edit_profile_modal');

    if (!userAvatarContainer || !editProfileIcon) return;

    // Show edit icon on avatar hover
    userAvatarContainer.addEventListener('mouseenter', () => {
        editProfileIcon.classList.remove('hidden');
    });

    userAvatarContainer.addEventListener('mouseleave', () => {
        editProfileIcon.classList.add('hidden');
    });

    // Handle edit icon click - redirect to profile page instead of modal
    editProfileIcon.addEventListener('click', () => {
        window.location.href = '../user/profile.html';
    });
}

// Function to populate the profile edit form (requires user_data to be fetched)
function populate_profile_form() {
    const edit_first_name_input =
        profile_edit_modal.querySelector(`#edit_first_name`);
    const edit_last_name_input =
        profile_edit_modal.querySelector(`#edit_last_name`);
    const edit_username_input =
        profile_edit_modal.querySelector(`#edit_username`);
    const edit_phone_number_input =
        profile_edit_modal.querySelector(`#edit_phone_number`);
    const edit_password_input =
        profile_edit_modal.querySelector(`#edit_password`);
    const edit_confirm_password_input = profile_edit_modal.querySelector(
        `#edit_confirm_password`
    ); // Get confirm password fields to clear them

    if (
        !edit_first_name_input ||
        !edit_last_name_input ||
        !edit_username_input ||
        !edit_phone_number_input ||
        !user_data
    )
        return;

    edit_first_name_input.value = user_data.first_name || '';
    edit_last_name_input.value = user_data.last_name || '';
    edit_username_input.value = user_data.username || '';
    edit_phone_number_input.value = user_data.phone_number || '';
    // Clear password fields when opening the modal
    if (edit_password_input) edit_password_input.value = '';
    if (edit_confirm_password_input) edit_confirm_password_input.value = '';
}

// --- Account Dropdown Logic for Balance Card ---
function setupAccountDropdown(accounts, selectedAccountNumber) {
    // Helper to mask/unmask
    function getDisplayNumber(account) {
        const isMasked = accountMaskState[account.account_number] !== false;
        return isMasked
            ? maskAccountNumber(account.account_number)
            : account.account_number;
    }
    function getEyeIconClass(account) {
        return accountMaskState[account.account_number] !== false
            ? 'fa-eye'
            : 'fa-eye-slash';
    }

    // --- Portal Dropdown Logic ---
    let floatingDropdown = null;
    let outsideClickHandler = null;

    function closeFloatingDropdown() {
        if (floatingDropdown && floatingDropdown.parentNode) {
            floatingDropdown.parentNode.removeChild(floatingDropdown);
            floatingDropdown = null;
        }
        if (outsideClickHandler) {
            document.removeEventListener('mousedown', outsideClickHandler);
            outsideClickHandler = null;
        }
        dropdownTrigger.classList.remove('active');
        document.body.classList.remove('dropdown-open');
    }

    function openFloatingDropdown() {
        closeFloatingDropdown(); // Ensure only one
        // Create dropdown
        floatingDropdown = document.createElement('div');
        floatingDropdown.className = 'account-dropdown-list';
        floatingDropdown.style.position = 'fixed';
        floatingDropdown.style.background = '#fff';
        floatingDropdown.style.borderRadius = '0 0 18px 18px';
        floatingDropdown.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
        floatingDropdown.style.zIndex = '9999';
        floatingDropdown.style.overflowY = 'auto';
        floatingDropdown.style.maxHeight = '320px';
        floatingDropdown.style.border = 'none';
        // Render options
        accounts.forEach((account) => {
            const option = document.createElement('div');
            option.className = 'account-dropdown-option';
            if (account.account_number === window.selectedAccountNumber) {
                option.classList.add('selected');
            }
            const isMasked = accountMaskState[account.account_number] !== false;
            option.innerHTML = `
                <span class="account-type">${
                    account.account_type
                        ? account.account_type.charAt(0).toUpperCase() +
                          account.account_type.slice(1)
                        : 'Account'
                } Account</span>
                <span class="account-number" style="margin-left:10px; font-family:monospace;">${
                    isMasked
                        ? maskAccountNumber(account.account_number)
                        : account.account_number
                }</span>
            `;
            option.addEventListener('click', () => {
                window.selectedAccountNumber = account.account_number;
                updateAccountDropdownDisplay(account);
                update_balance_display(account.balance);
                fetchRecentTransactions(account.account_number);
                closeFloatingDropdown();
                renderDropdown();
            });
            floatingDropdown.appendChild(option);
        });
        document.body.appendChild(floatingDropdown);
        // Position below trigger, aligned with balance card or centered on mobile
        const card = document.querySelector('.balance-card');
        const cardRect = card.getBoundingClientRect();
        const triggerRect = dropdownTrigger.getBoundingClientRect();
        let dropdownWidth, left, top;
        top = triggerRect.bottom;
        if (window.innerWidth <= 768) {
            dropdownWidth = cardRect.width;
            left = cardRect.left;
            floatingDropdown.style.borderRadius = '18px';
        } else {
            dropdownWidth = cardRect.width;
            left = cardRect.left;
            floatingDropdown.style.borderRadius = '0 0 18px 18px';
        }
        floatingDropdown.style.left = left + 'px';
        floatingDropdown.style.top = top + 'px';
        floatingDropdown.style.width = dropdownWidth + 'px';
        // Outside click closes
        outsideClickHandler = function (e) {
            if (
                !floatingDropdown.contains(e.target) &&
                !dropdownTrigger.contains(e.target)
            ) {
                closeFloatingDropdown();
            }
        };
        document.addEventListener('mousedown', outsideClickHandler);
        dropdownTrigger.classList.add('active');
        document.body.classList.add('dropdown-open');
    }

    function renderDropdown() {
        // No-op: dropdown is now rendered in body
    }

    function updateAccountDropdownDisplay(account) {
        dropdownType.textContent = `${
            account.account_type
                ? account.account_type.charAt(0).toUpperCase() +
                  account.account_type.slice(1)
                : 'Account'
        } Account`;
        dropdownNumber.textContent = getDisplayNumber(account);
        // Update eye icon
        const icon = dropdownEye.querySelector('i');
        if (icon) {
            icon.className = 'fas ' + getEyeIconClass(account);
        }
        // Always update balance
        update_balance_display(account.balance);
    }

    // Initial display
    let selected =
        accounts.find((a) => a.account_number === selectedAccountNumber) ||
        accounts[0];
    if (!selected && accounts.length > 0) selected = accounts[0];
    if (!selected) {
        // Fallback/mock data for UI testing
        selected = {
            account_type: 'Savings',
            account_number: '0000000001',
            balance: 0.0,
        };
        accounts = [selected];
    }
    updateAccountDropdownDisplay(selected);
    fetchRecentTransactions(selected.account_number);
    renderDropdown();

    // Eye icon toggles mask for selected account
    dropdownEye.onclick = (e) => {
        e.stopPropagation();
        const acc =
            accounts.find(
                (a) => a.account_number === window.selectedAccountNumber
            ) || selected;
        if (!acc) return;
        accountMaskState[acc.account_number] = !(
            accountMaskState[acc.account_number] !== false
        );
        updateAccountDropdownDisplay(acc);
    };

    // Show/hide floating dropdown
    dropdownArrow.onclick = (e) => {
        e.stopPropagation();
        if (dropdownTrigger.classList.contains('active')) {
            closeFloatingDropdown();
        } else {
            openFloatingDropdown();
        }
    };
    dropdownTrigger.onclick = (e) => {
        e.stopPropagation();
        if (dropdownTrigger.classList.contains('active')) {
            closeFloatingDropdown();
        } else {
            openFloatingDropdown();
        }
    };
}

// Add this function before the DOMContentLoaded event
// Copy to clipboard with fallback
function copyToClipboard(text) {
    return new Promise((resolve, reject) => {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
                .writeText(text)
                .then(() => resolve())
                .catch((err) => {
                    console.log(
                        'Modern clipboard API failed, trying fallback:',
                        err
                    );
                    // Fall back to textarea method
                    fallbackCopyToClipboard(text, resolve, reject);
                });
        } else {
            // Use fallback method
            fallbackCopyToClipboard(text, resolve, reject);
        }
    });
}

// Fallback copy method using textarea
function fallbackCopyToClipboard(text, resolve, reject) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            resolve();
        } else {
            reject(new Error('Copy command failed'));
        }
    } catch (err) {
        reject(err);
    }
}

// Function to display a random financial tip
function displayFinancialTip() {
    const tipContainer = document.getElementById('financial_tip_container');
    if (!tipContainer) return;
    if (!Array.isArray(FINANCIAL_TIPS) || FINANCIAL_TIPS.length === 0) {
        tipContainer.innerHTML = '';
        return;
    }
    const tip = FINANCIAL_TIPS[Math.floor(Math.random() * FINANCIAL_TIPS.length)];
    tipContainer.innerHTML = `
        <div class="tip-header">
            <i class="fas ${tip.icon}"></i>
            <h3>Financial Tip</h3>
        </div>
        <div class="tip-content">
            <h4>${tip.title}</h4>
            <p>${tip.content}</p>
        </div>
    `;
}

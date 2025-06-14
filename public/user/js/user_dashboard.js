// Extend the existing API object from session-manager.js
// Add dashboard-specific endpoints
if (!API.USER) API.USER = {};
if (!API.CONTENT) API.CONTENT = {};

// Add or update USER endpoints
Object.assign(API.USER, {
    ACCOUNTS: '../../src/api/user/accounts.php',
    TRANSACTIONS: '../../src/api/user/transactions.php',
    FINANCIAL_TIPS: '../../src/api/user/financial-tips.php'
});

// No need to redefine ROUTES as it's already declared in session-manager.js

// Currency
const CURRENCY = {
    SYMBOL: '₱',
    LOCALE: 'en-US'
};

// Timing (in milliseconds)
const TIMING = {
    NOTIFICATION_DURATION: 3000,
    REDIRECT_DELAY: 2000,
    ANIMATION_DELAY: 300,
    REFRESH_INTERVAL: 30000 // Add refresh interval (30 seconds)
};

// Account Status
const ACCOUNT_STATUS = {
    ACTIVE: 'active'
};

// DOM Elements
const nav_links = document.querySelectorAll('.nav-link');
const logout_btn = document.getElementById('logout_btn');
const notification_btn = document.getElementById('notification_btn');
const add_btn = document.getElementById('add_btn');
const help_btn = document.getElementById('help_btn');
const transfer_now_btn = document.getElementById('transfer_now_btn');
const account_balance_element = document.getElementById('account_balance');
const transaction_list_element = document.getElementById('transaction_list');
const user_name_element = document.getElementById('user_name');
const account_display_container = document.getElementById('account-display-container');
const user_avatar_container = document.getElementById('user_avatar_container');
const profile_edit_modal = document.getElementById('edit_profile_modal');

// State
let user_data = {}; // Will be populated from API
let user_accounts = []; // Will be populated from API
let accountNumbersMasked = true;
let refreshTimer = null; // Timer for auto-refresh


function show_notification(message, type) {
    const notification_container = document.querySelector('.notification-container'); 
    if (!notification_container) return;

    const notification = document.createElement('div');
    notification.classList.add('notification', type);

    // Icons for different notification types
    const ICON = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-circle',
        default: 'fas fa-bell'
    };

    let icon_class = ICON[type] || ICON.default;

    notification.innerHTML = `<i class="${icon_class}"></i> <span>${message}</span>`;
    notification_container.appendChild(notification);

    // Automatically remove the notification after a few seconds
    setTimeout(() => {
        notification.remove();
    }, 3000); // 3 seconds notification duration
}


// Fetch user data from API
async function fetchUserData() {
    try {
        // Use the new session check endpoint instead of profile.php
        const response = await fetch(API.AUTH.SESSION_CHECK);
        const data = await response.json();

        if (data.success && data.authenticated) {
            user_data = data.user; // Store user data in state
            if (user_name_element) {
                user_name_element.textContent = `${user_data.first_name} ${user_data.last_name}`.trim();
            }
             // Assuming there is a welcome_user_name_element on the dashboard
             const welcome_user_name_element = document.getElementById('welcome_user_name');
             if (welcome_user_name_element) welcome_user_name_element.textContent = user_data.first_name;

             display_user_initial(); // Update the initial
        } else {
            show_notification(data.error || 'Session expired or invalid', 'error');
            // Redirect to login page if not authenticated
            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, 2000); // 2 seconds delay
        }
    } catch (error) {
        show_notification('Error fetching user data', 'error');
        console.error('Error:', error);
    }
}


// Fetch user accounts from API and display primary account balance
async function fetchUserAccounts() {
    try {
        const response = await fetch(API.USER.ACCOUNTS);
        const data = await response.json();

        if (data.success) {
            user_accounts = data.accounts || []; // Store accounts in state, handle empty array
             updateAccountDisplay(); // Call function to update account display and balance
        } else {
            show_notification(data.error || 'Failed to fetch accounts', 'error');
            user_accounts = []; // Ensure state is empty on error
             updateAccountDisplay(); // Still call update to show empty state
        }
    } catch (error) {
        show_notification('Error fetching accounts', 'error');
        console.error('Error:', error);
        user_accounts = []; // Ensure state is empty on error
         updateAccountDisplay(); // Still call update to show error state
    }
}

// Add this helper function for masking account numbers
function maskAccountNumber(accountNumber) {
    if (!accountNumber) return '';
    return accountNumbersMasked ? 
        '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4) : 
        accountNumber;
}

// Update Account Display (similar to account.js but for dashboard)
function updateAccountDisplay() {
    if (!account_display_container || !account_balance_element || !transfer_now_btn) return;

    account_display_container.innerHTML = ''; // Clear existing content
    console.log('User accounts data:', user_accounts);

    const active_accounts = user_accounts.filter(account => account.status === ACCOUNT_STATUS.ACTIVE);

    if (active_accounts.length > 0) {
        // Find the account with the lowest account number (544250000007)
        const defaultAccount = active_accounts.reduce((lowest, current) => {
            return current.account_number < lowest.account_number ? current : lowest;
        }, active_accounts[0]);

        // Create the main account display container
        const accountSelector = document.createElement('div');
        accountSelector.classList.add('account-number-display');

        // Create the account number text display
        const accountNumberText = document.createElement('span');
        accountNumberText.classList.add('account-number-text');
        accountNumberText.textContent = maskAccountNumber(defaultAccount.account_number);
        accountNumberText.setAttribute('data-account-number', defaultAccount.account_number);

        // Create controls container
        const controls = document.createElement('div');
        controls.classList.add('account-controls');

        // Add toggle mask button
        const toggleMaskBtn = document.createElement('button');
        toggleMaskBtn.classList.add('account-toggle-mask');
        toggleMaskBtn.innerHTML = `<i class="${accountNumbersMasked ? 'fas fa-eye' : 'fas fa-eye-slash'}"></i>`;
        toggleMaskBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAccountNumberMask();
        });

        // Only add dropdown if there are multiple accounts
        if (active_accounts.length > 1) {
            // Add dropdown arrow
            const dropdownArrow = document.createElement('button');
            dropdownArrow.classList.add('account-dropdown-arrow');
            dropdownArrow.innerHTML = `<i class="fas fa-chevron-down"></i>`;

            // Create dropdown container
            const dropdownContainer = document.createElement('div');
            dropdownContainer.classList.add('dropdown-container');

            // Function to create dropdown items
            const createDropdownItem = (account, currentDisplayedAccount) => {
                if (account.account_number === currentDisplayedAccount) return null;
                
                const dropdownItem = document.createElement('div');
                dropdownItem.classList.add('dropdown-item');
                dropdownItem.textContent = maskAccountNumber(account.account_number);
                dropdownItem.setAttribute('data-account-number', account.account_number);
                dropdownItem.setAttribute('data-balance', account.balance);
                
                dropdownItem.addEventListener('click', () => {
                    // Update displayed account
                    accountNumberText.textContent = maskAccountNumber(account.account_number);
                    accountNumberText.setAttribute('data-account-number', account.account_number);
                    update_balance_display(parseFloat(account.balance));
                    
                    // Fetch transactions for the selected account
                    fetchRecentTransactions(account.account_number);

                    // Rebuild dropdown with new items
                    dropdownContainer.innerHTML = '';
                    active_accounts.forEach(acc => {
                        const newItem = createDropdownItem(acc, account.account_number);
                        if (newItem) dropdownContainer.appendChild(newItem);
                    });

                    // Hide dropdown after selection
                    dropdownContainer.classList.remove('active');
                    dropdownArrow.querySelector('i').classList.remove('active');
                });
                
                return dropdownItem;
            };

            // Add initial dropdown items
            active_accounts.forEach(account => {
                const dropdownItem = createDropdownItem(account, defaultAccount.account_number);
                if (dropdownItem) dropdownContainer.appendChild(dropdownItem);
            });

            // Toggle dropdown on arrow click
            dropdownArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContainer.classList.toggle('active');
                dropdownArrow.querySelector('i').classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!accountSelector.contains(e.target)) {
                    dropdownContainer.classList.remove('active');
                    dropdownArrow.querySelector('i').classList.remove('active');
                }
            });

            controls.appendChild(toggleMaskBtn);
            controls.appendChild(dropdownArrow);
            accountSelector.appendChild(accountNumberText);
            accountSelector.appendChild(controls);
            accountSelector.appendChild(dropdownContainer);
        } else {
            // Single account display
            controls.appendChild(toggleMaskBtn);
            accountSelector.appendChild(accountNumberText);
            accountSelector.appendChild(controls);
        }

        account_display_container.appendChild(accountSelector);

        // Update balance display for the displayed account
        update_balance_display(parseFloat(defaultAccount.balance));
        
        // Fetch transactions for the default account
        fetchRecentTransactions(defaultAccount.account_number);

        // Enable/Disable transfer button based on displayed account balance
        if (parseFloat(defaultAccount.balance) > 0) {
            transfer_now_btn.classList.remove('disabled');
            transfer_now_btn.style.pointerEvents = 'auto';
        } else {
            transfer_now_btn.classList.add('disabled');
            transfer_now_btn.style.pointerEvents = 'none';
        }
    } else {
        // No active accounts
        account_display_container.innerHTML = `<p class="no-account-message">No active accounts linked</p>`;
        update_balance_display(0);
        transfer_now_btn.classList.add('disabled');
        transfer_now_btn.style.pointerEvents = 'none';
    }
}

// Toggle account number masking
function toggleAccountNumberMask() {
    accountNumbersMasked = !accountNumbersMasked;
    
    // Update all account number displays
    const accountNumbers = document.querySelectorAll(`.account-number-text`);
    const options = document.querySelectorAll('#dashboard_account_select option');
    const toggleButtons = document.querySelectorAll(`.account-toggle-mask`);
    
    // Update the eye icon on all toggle buttons
    toggleButtons.forEach(btn => {
        btn.innerHTML = `<i class="${accountNumbersMasked ? 'fas fa-eye' : 'fas fa-eye-slash'}"></i>`;
    });
    
    // Update account numbers in single display
    accountNumbers.forEach(element => {
        const accountNumber = element.getAttribute('data-account-number');
        if (accountNumber) {
            element.textContent = maskAccountNumber(accountNumber);
        }
    });
    
    // Update account numbers in dropdown
    options.forEach(option => {
        const accountNumber = option.value;
        option.textContent = maskAccountNumber(accountNumber);
    });
}

// Update Balance Display
function update_balance_display(balance) {
    if (account_balance_element) {
        const formatted_balance = `₱ ${parseFloat(balance).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
        account_balance_element.textContent = formatted_balance;
    }
}

// Fetch recent transactions for the dashboard
async function fetchRecentTransactions(accountNumber) {
    try {
        // Get the current selected account number if not provided
        if (!accountNumber) {
            const accountNumberElement = document.querySelector('.account-number-text');
            if (accountNumberElement) {
                accountNumber = accountNumberElement.getAttribute('data-account-number');
            }
        }
        
        if (!accountNumber) {
            // No account number available, show a message
            if (transaction_list_element) {
                transaction_list_element.innerHTML = '<p class="no-transactions-message">Select an account to view transactions.</p>';
            }
            return;
        }
        
        // Update the API endpoint path with account filter
        const response = await fetch(`${API.USER.TRANSACTIONS}?account=${accountNumber}&limit=5`);
        
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
                recentTransactions.forEach(transaction => {
                    const transactionItem = document.createElement('div');
                    transactionItem.classList.add('transaction-item');
                    
                    // Determine transaction type for styling
                    const isDeposit = transaction.type === 'deposit' || 
                                      parseFloat(transaction.amount) >= 0 ||
                                      (transaction.description && transaction.description.toLowerCase().includes('deposit'));
                    
                    const amountClass = isDeposit ? 'deposit' : 'withdrawal';
                    
                    // Format the amount for display
                    const formattedAmount = Math.abs(parseFloat(transaction.amount)).toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    });
                    
                    // Format the date to be more user-friendly
                    let formattedDate = transaction.date;
                    try {
                        const dateObj = new Date(transaction.date);
                        formattedDate = dateObj.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                        });
                    } catch (e) {
                        console.log("Date formatting error:", e);
                    }
                    
                    transactionItem.innerHTML = `
                        <span class="transaction-date">${formattedDate}</span>
                        <span class="transaction-amount ${amountClass}">${isDeposit ? '+' : '-' }₱${formattedAmount}</span>
                    `;
                    transaction_list_element.appendChild(transactionItem);
                });
            }
        } else {
            // Handle case with no transactions
            if (transaction_list_element) {
                transaction_list_element.innerHTML = '<p class="no-transactions-message">No recent transactions for this account.</p>';
            }
        }
    } catch (error) {
        console.log('Error fetching transactions:', error);
        if (transaction_list_element) {
            transaction_list_element.innerHTML = '<p class="no-transactions-message">Failed to load transactions.</p>';
        }
    }
}


// Function to display user initial in the avatar circle
function display_user_initial() {
    if (!user_avatar_container) return;
    
    // Use user_data fetched from API
    const userName = user_data.first_name && user_data.last_name 
        ? `${user_data.first_name} ${user_data.last_name}`.trim() 
        : (user_name_element ? user_name_element.textContent.trim() : 'User');
    
    const initial = userName.charAt(0).toUpperCase();
    user_avatar_container.textContent = initial;
}

// Keep the setup_smooth_animations and setup_profile_edit functions if they are needed on this page
// Function to setup smooth animations (assuming existing)
function setup_smooth_animations() {
    // Existing animation setup code
    console.log('Setting up smooth animations (placeholder)');
}

// Function to setup profile edit interactions (assuming modals and elements exist in user_dashboard.html)
function setup_profile_edit() {
    const userAvatarContainer = document.getElementById('user_avatar_container');
    const editProfileIcon = document.getElementById('edit_profile_icon');
    const profileEditModal = document.getElementById('edit_profile_modal');
    
    if (!userAvatarContainer || !editProfileIcon) return; // Exit if elements don't exist
    
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
     const edit_first_name_input = profile_edit_modal.querySelector(`#edit_first_name`);
     const edit_last_name_input = profile_edit_modal.querySelector(`#edit_last_name`);
     const edit_username_input = profile_edit_modal.querySelector(`#edit_username`);
     const edit_phone_number_input = profile_edit_modal.querySelector(`#edit_phone_number`);
     const edit_password_input = profile_edit_modal.querySelector(`#edit_password`); // Get password fields to clear them
     const edit_confirm_password_input = profile_edit_modal.querySelector(`#edit_confirm_password`); // Get confirm password fields to clear them

     if (!edit_first_name_input || !edit_last_name_input || !edit_username_input || !edit_phone_number_input || !user_data) return;

     edit_first_name_input.value = user_data.first_name || '';
     edit_last_name_input.value = user_data.last_name || '';
     edit_username_input.value = user_data.username || '';
     edit_phone_number_input.value = user_data.phone_number || '';
      // Clear password fields when opening the modal
     if (edit_password_input) edit_password_input.value = '';
     if (edit_confirm_password_input) edit_confirm_password_input.value = '';

 }

// Fetch and display financial tip
async function fetchFinancialTip() {
    try {
        const response = await fetch(API.USER.FINANCIAL_TIPS);
        const data = await response.json();

        if (data.success) {
            const tipContainer = document.getElementById('financial_tip_container');
            if (!tipContainer) return;

            tipContainer.innerHTML = `
                <div class="tip-content">
                    <h3 class="tip-title">${data.tip.title}</h3>
                    <p class="tip-text">${data.tip.subtitle}</p>
                </div>
            `;
        } else {
            // Handle unsuccessful response
            console.log('Financial tip data not available:', data.error || 'Unknown error');
        }
    } catch (error) {
        console.log('Error fetching financial tip:', error);
        // Don't let this error block the rest of the dashboard from loading
        const tipContainer = document.getElementById('financial_tip_container');
        if (tipContainer) {
            tipContainer.innerHTML = `
                <div class="tip-content">
                    <h3 class="tip-title">Financial Wisdom</h3>
                    <p class="tip-text">Save a little every day for a secure future.</p>
                </div>
            `;
        }
    }
}

// Initialize Dashboard
function init_dashboard() {
    fetchUserData(); // Fetch user data first
    
    // Check for recent transaction in localStorage
    const lastTransaction = localStorage.getItem('last_transaction');
    if (lastTransaction) {
        try {
            const transactionData = JSON.parse(lastTransaction);
            const transactionTime = transactionData.timestamp;
            const currentTime = Date.now();
            
            // If the transaction was in the last 5 minutes, show notification
            if (currentTime - transactionTime < 5 * 60 * 1000) {
                show_notification('Balance updated after recent transaction', 'success');
                // Force immediate refresh of account data
                fetchUserAccounts();
                // Remove the transaction data to prevent duplicate notifications
                localStorage.removeItem('last_transaction');
            }
        } catch (e) {
            console.error('Error parsing last transaction:', e);
            localStorage.removeItem('last_transaction');
        }
    } else {
        // Normal fetch if no recent transaction
        fetchUserAccounts(); // Fetch accounts (this will also fetch transactions for the selected account)
    }
    
    fetchFinancialTip(); // Fetch financial tip
    setup_smooth_animations(); // Keep existing setup
    setup_profile_edit(); // Setup profile edit interactions
    
    // Check URL parameters for transaction success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fund_transfer_success') || urlParams.has('transaction_success')) {
        show_notification('Transaction completed successfully', 'success');
        // Clean URL without refreshing page
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Setup auto-refresh for account data
    setupAutoRefresh();

    console.log('StackOvercash Dashboard Initialized Dynamically');
}

// Setup auto-refresh for account data
function setupAutoRefresh() {
    // Clear any existing timer
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    // Set up periodic refresh
    refreshTimer = setInterval(() => {
        console.log('Auto-refreshing account data');
        fetchUserAccounts(); // This will update balance and transactions
    }, TIMING.REFRESH_INTERVAL);
    
    // Also refresh when the page becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('Page became visible, refreshing data');
            fetchUserAccounts();
        }
    });
    
    // Refresh when returning from other pages
    window.addEventListener('pageshow', (event) => {
        // If the page is loaded from cache (back/forward navigation)
        if (event.persisted) {
            console.log('Page loaded from cache, refreshing data');
            fetchUserAccounts();
        }
    });
}

// Add click handler for transfer now button (assuming it navigates)
if (transfer_now_btn) {
    transfer_now_btn.addEventListener('click', (event) => {
        // Prevent default navigation if disabled
        if (transfer_now_btn.classList.contains('disabled')) {
            event.preventDefault();
             show_notification('Please add an account with a balance to transfer funds.', CLASS.INFO);
            return;
        }
        // Proceed with navigation if not disabled
        window.location.href = '../user/transfer.html';
    });
}


// Initial load
document.addEventListener('DOMContentLoaded', () => {
    init_dashboard(); // Start the dynamic initialization
});


// Keep the format_currency_exact function if it's used elsewhere and needed globally
// It seems update_balance_display formats directly now, so maybe not needed.
// function format_currency_exact(amount) { ... }

// Keep the create_transaction_element_exact and add_transaction_hover_effect if needed for transactions display
// These seem to be integrated into fetchRecentTransactions and render logic now, maybe not needed globally.
// function create_transaction_element_exact(transaction) { ... }
// function add_transaction_hover_effect(item) { ... }

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
        show_notification('Logout might not have been fully successful', 'warning');
        // Redirect anyway after a short delay
        setTimeout(() => {
            window.location.href = './index.html';
        }, 1500);
    }
}

// Event listener for logout button
if (logout_btn) {
    logout_btn.addEventListener('click', (event) => {
        // Prevent the default navigation to ensure our handleLogout function completes
        event.preventDefault(); 
        handleLogout();
    });
}

// --- END OF FILE ---


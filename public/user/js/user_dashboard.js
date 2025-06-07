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
const profile_edit_modal = document.getElementById('edit_profile_modal'); // Assuming the profile edit modal is in dashboard.html as well

// State
let user_data = {}; // Will be populated from API
let user_accounts = []; // Will be populated from API
let accountNumbersMasked = true;


function show_notification(message, type) {
    const notification_container = document.querySelector('.notification-container'); 
    if (!notification_container) return;

    const notification = document.createElement('div');
    notification.classList.add('notification', type);

    let icon_class = '';
    if (type === 'success') {
        icon_class = 'fas fa-check-circle';
    } else if (type === 'info') {
        icon_class = 'fas fa-info-circle';
    } else if (type === 'error') {
        icon_class = 'fas fa-times-circle';
    }

    notification.innerHTML = `<i class="${icon_class}"></i> <span>${message}</span>`;
    notification_container.appendChild(notification);

    // Automatically remove the notification after a few seconds
    setTimeout(() => {
        notification.remove();
    }, 3000); // Hide after 3 seconds
}


// Fetch user data from API
async function fetchUserData() {
    try {
        // Use the new session check endpoint instead of profile.php
        const response = await fetch('../../src/api/auth/session_check.php');
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
                window.location.href = './login_account_holder.html';
            }, 2000);
        }
    } catch (error) {
        show_notification('Error fetching user data', 'error');
        console.error('Error:', error);
    }
}


// Fetch user accounts from API and display primary account balance
async function fetchUserAccounts() {
    try {
        const response = await fetch('../../src/api/user/accounts.php');
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

    const active_accounts = user_accounts.filter(account => account.status === 'active');

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
        toggleMaskBtn.innerHTML = `<i class="fas ${accountNumbersMasked ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
        toggleMaskBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAccountNumberMask();
        });

        // Only add dropdown if there are multiple accounts
        if (active_accounts.length > 1) {
            // Add dropdown arrow
            const dropdownArrow = document.createElement('button');
            dropdownArrow.classList.add('account-dropdown-arrow');
            dropdownArrow.innerHTML = '<i class="fas fa-chevron-down"></i>';

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

// Add this new function to toggle account number masking
function toggleAccountNumberMask() {
    accountNumbersMasked = !accountNumbersMasked;
    
    // Update all account number displays
    const accountNumbers = document.querySelectorAll('.account-number-text');
    const options = document.querySelectorAll('#dashboard_account_select option');
    const toggleButtons = document.querySelectorAll('.account-toggle-mask');
    
    // Update the eye icon on all toggle buttons
    toggleButtons.forEach(btn => {
        btn.innerHTML = `<i class="fas ${accountNumbersMasked ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
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

// Fetch recent transactions from API
async function fetchRecentTransactions() {
     try {
        // Update the API endpoint path
        const response = await fetch('/project-errawrs/src/api/user/transactions.php?limit=3');
        const data = await response.json();

        if (data.success && data.transactions.length > 0) {
            if (transaction_list_element) {
                transaction_list_element.innerHTML = ''; // Clear existing static content
                data.transactions.forEach(transaction => {
                     const transactionItem = document.createElement('div');
                     transactionItem.classList.add('transaction-item');
                     const amountClass = parseFloat(transaction.amount) >= 0 ? 'positive' : 'negative';
                      const formattedAmount = parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                     transactionItem.innerHTML = `
                         <span class="transaction-date">${transaction.date}</span>
                         <span class="transaction-amount ${amountClass}">${parseFloat(transaction.amount) >= 0 ? '+' : '-' }₱${formattedAmount}</span>
                     `;
                     transaction_list_element.appendChild(transactionItem);
                });
            }
        } else {
             // Handle case with no transactions
            if (transaction_list_element) {
                transaction_list_element.innerHTML = '<p class="no-transactions-message">No recent transactions.</p>';
            }
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
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
     // Assuming modals and elements for profile edit exist in user_dashboard.html
     // This function needs to be adapted to work with fetched user_data
     const edit_profile_icon = document.getElementById('edit_profile_icon'); // Assuming this exists
     const save_profile_button = profile_edit_modal ? profile_edit_modal.querySelector('#save_profile_button') : null; // Assuming button inside modal
     const exit_profile_button = profile_edit_modal ? profile_edit_modal.querySelector('#exit_profile_button') : null; // Assuming button inside modal

      if (!user_avatar_container || !edit_profile_icon || !profile_edit_modal || !save_profile_button || !exit_profile_button) {
         console.log('Profile edit elements not found on dashboard.');
         return;
     }

     // Show pen icon on hover
     user_avatar_container.addEventListener('mouseenter', () => {
         edit_profile_icon.classList.remove('hidden');
     });

     // Hide pen icon when not hovering over avatar or icon
     user_avatar_container.addEventListener('mouseleave', () => {
         setTimeout(() => {
             if (!edit_profile_icon.matches(':hover')) {
                 edit_profile_icon.classList.add('hidden');
             }
         }, 50);
     });

     edit_profile_icon.addEventListener('mouseenter', () => {
         edit_profile_icon.classList.remove('hidden');
     });

      edit_profile_icon.addEventListener('mouseleave', () => {
         edit_profile_icon.classList.add('hidden');
     });

    // Show modal on pen icon click
    edit_profile_icon.addEventListener('click', () => {
        populate_profile_form(); // Populate the form with current user_data
        profile_edit_modal.classList.remove('hidden');
    });

    // Close modal on Exit button click
    exit_profile_button.addEventListener('click', () => {
        profile_edit_modal.classList.add('hidden');
    });

    // Handle Save button click
    if (save_profile_button) {
        save_profile_button.addEventListener('click', async () => {
             const edit_first_name_input = profile_edit_modal.querySelector('#edit_first_name');
             const edit_last_name_input = profile_edit_modal.querySelector('#edit_last_name');
             const edit_username_input = profile_edit_modal.querySelector('#edit_username');
             const edit_password_input = profile_edit_modal.querySelector('#edit_password');
             const edit_confirm_password_input = profile_edit_modal.querySelector('#edit_confirm_password');
             const edit_phone_number_input = profile_edit_modal.querySelector('#edit_phone_number');

             const updatedProfileData = {
                 first_name: edit_first_name_input ? edit_first_name_input.value.trim() : user_data.first_name,
                 last_name: edit_last_name_input ? edit_last_name_input.value.trim() : user_data.last_name,
                 username: edit_username_input ? edit_username_input.value.trim() : user_data.username,
                 // Only send password fields if they are not empty
                 password: edit_password_input && edit_password_input.value.trim() !== '' ? edit_password_input.value : null,
                 confirm_password: edit_confirm_password_input && edit_confirm_password_input.value.trim() !== '' ? edit_confirm_password_input.value : null,
                 phone_number: edit_phone_number_input ? edit_phone_number_input.value.trim() : user_data.phone_number,
             };

             // Basic client-side validation for password if changed
             if (updatedProfileData.password !== null && updatedProfileData.password !== updatedProfileData.confirm_password) {
                  show_notification('Password and Confirm Password do not match', 'error');
                  if (edit_password_input) edit_password_input.value = '';
                  if (edit_confirm_password_input) edit_confirm_password_input.value = '';
                  return;
             }
             if (updatedProfileData.password !== null && updatedProfileData.password.length < 8) {
                  show_notification('Password must be at least 8 characters long', 'error');
                   if (edit_password_input) edit_password_input.value = '';
                   if (edit_confirm_password_input) edit_confirm_password_input.value = '';
                   return;
             }


            try {
                 // Assuming an API endpoint for updating user profile data
                 const response = await fetch('/project-errawrs/src/api/user/profile/update.php', {
                     method: 'POST', // Or PUT
                     headers: {
                         'Content-Type': 'application/json'
                     },
                     body: JSON.stringify(updatedProfileData)
                 });

                 const data = await response.json();

                 if (data.success) {
                     show_notification('Profile updated successfully!', 'success');
                     // Update local user_data state with new info (excluding password)
                     user_data.first_name = data.user.first_name; // Assuming API returns updated user data
                     user_data.last_name = data.user.last_name;
                     user_data.username = data.user.username;
                     user_data.phone_number = data.user.phone_number;

                      // Update displayed name and initial
                     if (user_name_element) user_name_element.textContent = `${user_data.first_name} ${user_data.last_name}`.trim();
                     display_user_initial();

                     profile_edit_modal.classList.add('hidden');
                      // Clear password fields after successful update
                     if (edit_password_input) edit_password_input.value = '';
                     if (edit_confirm_password_input) edit_confirm_password_input.value = '';
                 } else {
                     show_notification(data.error || 'Failed to update profile', 'error');
                 }
             } catch (error) {
                 show_notification('Error updating profile', 'error');
                 console.error('Error:', error);
             }
        });
    }

    // Close modal when clicking outside
    if (profile_edit_modal) {
         profile_edit_modal.addEventListener('click', (event) => {
             // Check if the click is directly on the modal backdrop
             if (event.target === profile_edit_modal) {
                 profile_edit_modal.classList.add('hidden');
             }
         });
    }
}

// Function to populate the profile edit form (requires user_data to be fetched)
function populate_profile_form() {
     const edit_first_name_input = profile_edit_modal.querySelector('#edit_first_name');
     const edit_last_name_input = profile_edit_modal.querySelector('#edit_last_name');
     const edit_username_input = profile_edit_modal.querySelector('#edit_username');
     const edit_phone_number_input = profile_edit_modal.querySelector('#edit_phone_number');
     const edit_password_input = profile_edit_modal.querySelector('#edit_password'); // Get password fields to clear them
     const edit_confirm_password_input = profile_edit_modal.querySelector('#edit_confirm_password'); // Get confirm password fields to clear them

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
        const response = await fetch('/project-errawrs/src/api/user/financial-tips.php');
        const data = await response.json();

        if (data.success && data.tip) {
            const tipContainer = document.getElementById('financial_tip_container');
            if (tipContainer) {
                tipContainer.innerHTML = `
                    <h3 class="tip-title">${data.tip.title}</h3>
                    <p class="tip-subtitle">${data.tip.subtitle}</p>
                `;
            }
        }
    } catch (error) {
        console.error('Error fetching financial tip:', error);
    }
}

// Initialize Dashboard
function init_dashboard() {
    fetchUserData(); // Fetch user data first
    fetchUserAccounts(); // Fetch accounts
    fetchRecentTransactions(); // Fetch transactions
    fetchFinancialTip(); // Fetch financial tip
    setup_smooth_animations(); // Keep existing setup
    setup_profile_edit(); // Setup profile edit interactions

    console.log('StackOvercash Dashboard Initialized Dynamically');
}


// Add click handler for transfer now button (assuming it navigates)
if (transfer_now_btn) {
    transfer_now_btn.addEventListener('click', (event) => {
        // Prevent default navigation if disabled
        if (transfer_now_btn.classList.contains('disabled')) {
            event.preventDefault();
             show_notification('Please add an account with a balance to transfer funds.', 'info');
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

        // Optional: Call backend logout API
        // Assuming a logout endpoint exists at /project-errawrs/src/api/auth/logout.php
        // Note: This fetch is fire-and-forget as we are navigating away immediately
        fetch('../../src/api/auth/logout.php', { method: 'POST' })
            .catch(error => console.error('Error during logout API call:', error));

        // Let the default link navigation to index.html happen
    } catch (error) {
        console.error('Error during logout:', error);
        // Optionally show a notification that logout might not have been clean
        show_notification('Logout might not have been fully successful.', 'warning');
    }
}

// Event listener for logout button
if (logout_btn) {
    logout_btn.addEventListener('click', (event) => {
        // Prevent default navigation immediately if you want to wait for API call
        // event.preventDefault(); 
        handleLogout();
        // If not preventing default, the browser will navigate after this function runs
    });
}

// --- END OF FILE ---


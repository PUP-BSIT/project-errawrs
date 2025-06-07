// DOM Elements
const account_list_container = document.querySelector(
    '.account-list-container'
);
const notification_container = document.querySelector(
    '.notification-container'
);
const account_type_modal = document.getElementById('account_type_modal');
const confirmation_modal = document.getElementById('confirmation_modal');
const otp_modal = document.getElementById('otp_modal');
const account_type_radios = document.querySelectorAll(
    'input[name="account_type"]'
);
const proceed_account_type_button = document.getElementById(
    'proceed_account_type_button'
);
const cancel_account_type_button = document.getElementById(
    'cancel_account_type_button'
);
const confirm_add_account_checkbox = document.getElementById(
    'confirm_add_account_checkbox'
);
const proceed_add_account_button = document.getElementById(
    'proceed_add_account_button'
);
const cancel_add_account_button = document.getElementById(
    'cancel_add_account_button'
);
const selected_account_type_span = document.getElementById(
    'selected_account_type'
);
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
const edit_confirm_password_input = document.getElementById(
    'edit_confirm_password'
);
const edit_phone_number_input = document.getElementById('edit_phone_number');
const user_name_element = document.getElementById('user_name');
const welcome_user_name_element = document.getElementById('welcome_user_name');

// Constants
const MAX_ACCOUNTS = 3;

// State
let selectedAccountType = null;
let userAccounts = [];
let user_data = {};

// Fetch user data from API
async function fetchUserData() {
    try {
        // Use session_check.php instead of profile.php
        const response = await fetch('../../src/api/auth/session_check.php');
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
            showNotification(data.error || 'Session expired or invalid', 'error');
            // Redirect to login page if not authenticated
            setTimeout(() => {
                window.location.href = './login_account_holder.html';
            }, 2000);
        }
    } catch (error) {
        showNotification('Error fetching user data', 'error');
        console.error('Error:', error);
    }
}

// Fetch user accounts from API
async function fetchUserAccounts() {
    try {
        const response = await fetch('../../src/api/user/accounts.php');
        const data = await response.json();

        // Debug log to see what accounts data we have
        console.log('User accounts data:', data.accounts);

        if (data.success) {
            userAccounts = data.accounts;
            updateAccountDisplay();
        } else {
            showNotification(data.error || 'Failed to fetch accounts', 'error');
        }
    } catch (error) {
        showNotification('Error fetching accounts', 'error');
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
    if (userAccounts.length < MAX_ACCOUNTS) {
        const addAccountPlaceholder = document.createElement('div');
        addAccountPlaceholder.classList.add('add-account-placeholder');
        addAccountPlaceholder.innerHTML = `
            <i class="fas fa-plus"></i>
            <span>Add New Account</span>
        `;
        addAccountPlaceholder.addEventListener('click', () => {
            account_type_modal.classList.remove('hidden');
        });
        account_list_container.appendChild(addAccountPlaceholder);
    }

    // Re-attach event listeners
    attachAccountItemListeners();
}

// Create account item element
function createAccountItem(account) {
    const accountItem = document.createElement('div');
    accountItem.classList.add('account-item');
    accountItem.dataset.accountId = account.id;

    // Format account_type for display
    const accountTypeDisplay = account.account_type 
        ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) 
        : 'Standard';
    
    accountItem.innerHTML = `
        <div class="account-info">
            <div class="info-group">
                <span class="info-label">Account No.</span>
                <span class="info-value">${account.account_number}</span>
            </div>
            <div class="info-group">
                <span class="info-label">Type</span>
                <span class="account-type-badge ${account.account_type ? account.account_type.toLowerCase() : 'standard'}">${accountTypeDisplay}</span>
            </div>
            <div class="info-group">
                <span class="info-label">Balance</span>
                <span class="info-value">₱ ${parseFloat(
                    account.balance
                ).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}</span>
            </div>
            <div class="info-group">
                <span class="info-label">Status</span>
                <span class="info-value account-status ${account.status.toLowerCase()}">${
        account.status
    }</span>
            </div>
        </div>
        <div class="account-actions">
            <button class="three-dots-button" ${
                account.status === 'closed' ? 'disabled' : ''
            }>
                <i class="fas fa-ellipsis-h"></i>
            </button>
            <div class="action-menu hidden">
                <button class="menu-item transfer-button">Transfer</button>
                <button class="menu-item close-button">Close</button>
            </div>
        </div>
    `;

    return accountItem;
}

// Attach event listeners to account items
function attachAccountItemListeners() {
    document.querySelectorAll('.three-dots-button').forEach((button) => {
        button.addEventListener('click', (e) => {
            const menu = e.target
                .closest('.account-actions')
                .querySelector('.action-menu');
            const allMenus = document.querySelectorAll('.action-menu');

            // Close all other menus
            allMenus.forEach((m) => {
                if (m !== menu) m.classList.add('hidden');
            });

            menu.classList.toggle('hidden');
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.account-actions')) {
            document.querySelectorAll('.action-menu').forEach((menu) => {
                menu.classList.add('hidden');
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
    if (selectedAccountType) {
        account_type_modal.classList.add('hidden');
        selected_account_type_span.textContent = selectedAccountType;
        confirmation_modal.classList.remove('hidden');
    }
});

cancel_account_type_button.addEventListener('click', () => {
    account_type_modal.classList.add('hidden');
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
        // Get the user's phone number from session data
        const phoneNumber = user_data.phone_number;
        
        if (!phoneNumber) {
            showNotification('Phone number not found in user profile', 'error');
            return;
        }
        
        // Store selected account type in localStorage for later use
        localStorage.setItem('pending_account_type', selectedAccountType);
        
        // Send OTP to user's phone number
        const response = await fetch(
            '../../src/api/auth/send_otp.php',
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
            confirmation_modal.classList.add('hidden');
            otp_modal.classList.remove('hidden');
            showNotification('OTP sent successfully. Please verify to complete account creation.', 'success');
            
            // Remove auto-filling of OTP
            if (otp_input) {
                otp_input.value = '';
            }
        } else {
            showNotification(data.error || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        showNotification('Error sending OTP', 'error');
        console.error('Error:', error);
    }
});

cancel_add_account_button.addEventListener('click', () => {
    confirmation_modal.classList.add('hidden');
    confirm_add_account_checkbox.checked = false;
    proceed_add_account_button.disabled = true;
});

// OTP Verification Handlers
verify_otp_button.addEventListener('click', async () => {
    const otp = otp_input.value.trim();

    if (!otp) {
        showNotification('Please enter OTP', 'error');
        return;
    }

    try {
        // Get the phone number from user data
        const phoneNumber = user_data.phone_number;
        
        if (!phoneNumber) {
            showNotification('Phone number not found in user profile', 'error');
            return;
        }
        
        // First verify the OTP
        const verifyResponse = await fetch(
            '../../src/api/auth/verify_otp.php',
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
            const accountType = localStorage.getItem('pending_account_type');
            
            if (!accountType) {
                showNotification('Account type not found. Please try again.', 'error');
                return;
            }
            
            // If OTP verification is successful, create the account
            const createResponse = await fetch(
                '../../src/api/user/create_additional_account.php',
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
                otp_modal.classList.add('hidden');
                showNotification('Account created successfully', 'success');
                
                // Clear the stored account type
                localStorage.removeItem('pending_account_type');
                
                await fetchUserAccounts(); // Refresh account list
            } else {
                showNotification(createData.error || 'Failed to create account', 'error');
            }
        } else {
            showNotification(verifyData.error || 'Invalid OTP', 'error');
        }
    } catch (error) {
        showNotification('Error verifying OTP', 'error');
        console.error('Error:', error);
    }
});

cancel_otp_button.addEventListener('click', () => {
    otp_modal.classList.add('hidden');
    otp_input.value = '';
});

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.classList.add('notification', type);

    let icon = '';
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-times-circle';
            break;
        case 'info':
            icon = 'fas fa-info-circle';
            break;
        default:
            icon = 'fas fa-bell';
    }

    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    notification_container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
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
        populate_profile_form();
        edit_profile_modal.classList.remove('hidden');
    });

    // Close modal on Exit button click
    exit_profile_button.addEventListener('click', () => {
        edit_profile_modal.classList.add('hidden');
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
        
        // Basic validation
        if (!updated_profile_data.first_name || !updated_profile_data.last_name) {
            showNotification('First name and last name are required', 'error');
            return;
        }
        
        // Only include password if it's not empty
        if (!updated_profile_data.password) {
            delete updated_profile_data.password;
            delete updated_profile_data.confirm_password;
        } else if (updated_profile_data.password !== updated_profile_data.confirm_password) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        try {
            // Send update to API
            const response = await fetch('../../src/api/user/profile/update.php', {
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
                
                showNotification('Profile updated successfully!', 'success');
                edit_profile_modal.classList.add('hidden');
            } else {
                showNotification(data.error || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Error updating profile', 'error');
        }
    });

    // Close modal when clicking outside
    edit_profile_modal.addEventListener('click', (event) => {
        if (event.target === edit_profile_modal) {
            edit_profile_modal.classList.add('hidden');
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
    console.log('StackOvercash Account Page Initialized Dynamically!');
});

// Function to handle logout
async function handleLogout() {
    try {
        // Clear relevant items from localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('account'); // Assuming account data is also stored
        localStorage.removeItem('token'); // If you are using tokens

        // Optional: Call backend logout API
        fetch('../../src/api/auth/logout.php', {
            method: 'POST',
        }).catch((error) =>
            console.error('Error during logout API call:', error)
        );

        // Let the default link navigation to index.html happen
    } catch (error) {
        console.error('Error during logout:', error);
        // Optionally show a notification that logout might not have been clean
        showNotification(
            'Logout might not have been fully successful.',
            'warning'
        );
    }
}

// Event listener for logout button
const logout_btn = document.getElementById('logout_btn');
if (logout_btn) {
    logout_btn.addEventListener('click', (event) => {
        // Prevent default navigation immediately if you want to wait for API call
        // event.preventDefault();
        handleLogout();
        // If not preventing default, the browser will navigate after this function runs
    });
}

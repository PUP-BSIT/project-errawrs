// DOM Elements
const select_bank_panel = document.getElementById('select-bank-panel');
const account_details_panel = document.getElementById('account-details-panel');
const bank_radio_buttons = document.querySelectorAll('input[name="bank"]');
const next_button = document.getElementById('next-button');
const send_money_button = document.getElementById('send-money-button');
const info_correct_checkbox = document.getElementById('info-correct');
const default_bank_label = document.getElementById('default-bank-label');
const stackovercash_bank_radio = document.getElementById('stackovercash_bank');
const your_account_select = document.getElementById('your-account');
const receiver_account_input = document.getElementById('receiver-account');
const amount_input = document.getElementById('amount');

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

// DOM Elements for Sidebar Profile Info (assuming they exist in transfer.html)
const user_name_element = document.getElementById('user_name');
const welcome_user_name_element = document.getElementById('welcome_user_name');

// State
let user_accounts = [];
let user_data = {};

// Function to show a notification (Assuming this is shared or implemented here)
function showNotification(message, type) {
    const notification_container = document.querySelector(
        '.notification-container'
    );
    if (!notification_container) return;

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

// Fetch user data from API
async function fetchUserData() {
    try {
        const response = await fetch(
            '../../src/api/auth/session_check.php'
        );
        const data = await response.json();

        if (data.success && data.authenticated) {
            user_data = data.user;
            if (user_name_element)
                user_name_element.textContent =
                    `${user_data.first_name} ${user_data.last_name}`.trim();
            if (welcome_user_name_element)
                welcome_user_name_element.textContent = user_data.first_name;
            display_user_initial();
        } else {
            showNotification(
                data.error || 'Session expired or invalid',
                'error'
            );
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

// Fetch user accounts and populate the 'Your Account' dropdown
async function populateAccountsDropdown() {
    try {
        const response = await fetch(
            '../../src/api/user/accounts.php'
        );
        const data = await response.json();

        if (data.success && data.accounts.length > 0) {
            user_accounts = data.accounts.filter(
                (account) => account.status === 'active'
            );
            your_account_select.innerHTML =
                '<option value="">Select Account</option>';
            user_accounts.forEach((account) => {
                const option = document.createElement('option');
                option.value = account.account_number;
                option.textContent = `${account.type} Account No. ${
                    account.account_number
                } (₱ ${parseFloat(account.balance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })})`;
                option.dataset.balance = account.balance;
                your_account_select.appendChild(option);
            });

            if (user_accounts.length > 0) {
                next_button.disabled = false;
            } else {
                showNotification(
                    'No active accounts found. Please add an account first.',
                    'info'
                );
                next_button.disabled = true;
            }
        } else {
            user_accounts = [];
            your_account_select.innerHTML =
                '<option value="">No active accounts available</option>';
            showNotification(data.error || 'Failed to fetch accounts', 'error');
            next_button.disabled = true;
        }
    } catch (error) {
        user_accounts = [];
        your_account_select.innerHTML =
            '<option value="">Error loading accounts</option>';
        showNotification('Error fetching accounts', 'error');
        console.error('Error:', error);
        next_button.disabled = true;
    }
}

// Function to check if a bank is selected
function is_bank_selected() {
    const selectedBank = document.querySelector('input[name="bank"]:checked');
    return selectedBank !== null;
}

// Function to check if info is correct
function is_info_correct() {
    return info_correct_checkbox ? info_correct_checkbox.checked : false;
}

// Function to update default label visibility
function update_default_label() {
    if (stackovercash_bank_radio && default_bank_label) {
        if (stackovercash_bank_radio.checked) {
            default_bank_label.style.display = 'block';
        } else {
            default_bank_label.style.display = 'none';
        }
    }
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

    // Simulate Save button click
    save_profile_button.addEventListener('click', () => {
        const updated_profile_data = {
            first_name: edit_first_name_input.value,
            last_name: edit_last_name_input.value,
            username: edit_username_input.value,
            password: edit_password_input.value,
            phone_number: edit_phone_number_input.value,
        };
        console.log('Saving profile data (simulated):', updated_profile_data);

        // Update the displayed name if first or last name changed (simulated)
        user_data.name =
            `${updated_profile_data.first_name} ${updated_profile_data.last_name}`.trim();
        const user_name_element = document.getElementById('user_name');
        if (user_name_element) user_name_element.textContent = user_data.name;
        display_user_initial();

        show_notification('Profile updated successfully!', 'success');

        edit_profile_modal.classList.add('hidden');
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
    edit_password_input.value = user_data.password || '';
    edit_confirm_password_input.value = user_data.password || '';
    edit_phone_number_input.value = user_data.phone_number || '';
}

// Event listener for bank radio buttons
bank_radio_buttons.forEach((radio) => {
    radio.addEventListener('change', () => {
        next_button.disabled = !is_bank_selected();
        update_default_label();
    });
});

// Event listener for the Next button
if (next_button) {
    next_button.addEventListener('click', () => {
        if (is_bank_selected()) {
            if (select_bank_panel) select_bank_panel.style.display = 'none';
            if (account_details_panel)
                account_details_panel.style.display = 'block';
            if (send_money_button)
                send_money_button.disabled = !is_info_correct();
        }
    });
}

// Event listener for the Info Correct checkbox
if (info_correct_checkbox) {
    info_correct_checkbox.addEventListener('change', () => {
        if (send_money_button) send_money_button.disabled = !is_info_correct();
    });
}

// Event listener for the Send Money button
if (send_money_button) {
    send_money_button.addEventListener('click', async () => {
        const senderAccountNumber = your_account_select
            ? your_account_select.value
            : '';
        const receiverAccountNumber = receiver_account_input
            ? receiver_account_input.value.trim()
            : '';
        const amount = amount_input
            ? parseFloat(amount_input.value.trim())
            : NaN;
        const infoCorrect = info_correct_checkbox
            ? info_correct_checkbox.checked
            : false;

        if (!senderAccountNumber) {
            showNotification('Please select your account', 'error');
            return;
        }
        if (!receiverAccountNumber) {
            showNotification('Please enter receiver account number', 'error');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showNotification(
                'Please enter a valid amount to transfer',
                'error'
            );
            return;
        }
        if (senderAccountNumber === receiverAccountNumber) {
            showNotification(
                'Cannot transfer money to the same account',
                'error'
            );
            return;
        }
        if (!infoCorrect) {
            showNotification(
                'Please confirm the information is correct',
                'error'
            );
            return;
        }

        const selectedAccount = user_accounts.find(
            (account) => account.account_number === senderAccountNumber
        );

        if (!selectedAccount) {
            showNotification('Selected account not found.', 'error');
            console.error(
                'Selected account not found in fetched data.',
                senderAccountNumber,
                user_accounts
            );
            return;
        }

        const senderAccountBalance = parseFloat(selectedAccount.balance);

        if (amount > senderAccountBalance) {
            showNotification('Insufficient balance', 'error');
            return;
        }

        try {
            const response = await fetch(
                '/project-errawrs/src/api/user/transfer.php',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sender_account_number: senderAccountNumber,
                        receiver_account_number: receiverAccountNumber,
                        amount: amount,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                showNotification('Transfer successful!', 'success');
                if (your_account_select) your_account_select.value = '';
                if (receiver_account_input) receiver_account_input.value = '';
                if (amount_input) amount_input.value = '';
                if (info_correct_checkbox)
                    info_correct_checkbox.checked = false;

                populateAccountsDropdown();
            } else {
                showNotification(data.error || 'Transfer failed', 'error');
            }
        } catch (error) {
            showNotification('Error during transfer', 'error');
            console.error('Error:', error);
        }
    });
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchUserData();
    populateAccountsDropdown();
    update_default_label();
    setup_profile_edit();

    console.log('StackOvercash Transfer Page Initialized Dynamically!');
});

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
        fetch('/project-errawrs/src/api/auth/logout.php', {
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

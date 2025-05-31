// DOM Elements
const three_dots_buttons = document.querySelectorAll('.three-dots-button');
const notification_container = document.querySelector('.notification-container');
const confirmation_modal = document.getElementById('confirmation_modal');
const otp_modal = document.getElementById('otp_modal');
const confirm_add_account_checkbox = document.getElementById('confirm_add_account_checkbox');
const proceed_add_account_button = document.getElementById('proceed_add_account_button');
const cancel_add_account_button = document.getElementById('cancel_add_account_button');
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

// Sample Account Data (Add status)
let user_accounts = [
    { number: '527491759361', balance: 3691.00, status: 'active' },
    { number: '123456789012', balance: 10500.50, status: 'active' },
];

// User Data (Add registration fields)
let user_data = {
    name: 'Jhon Doe',
    first_name: 'Jhon', // Added for edit form
    last_name: 'Doe', // Added for edit form
    username: 'jhondoe', // Added for edit form
    password: 'password123', // Added for edit form (in a real app, handle securely)
    phone_number: '123-456-7890', // Added for edit form
    // Add other user data as needed
};

const MAX_ACCOUNTS = 3;

// Function to show a notification
function show_notification(message, type) {
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

// Function to update the account list display and button visibility
function update_account_display() {
    const account_list_container = document.querySelector('.account-list-container');
    if (!account_list_container) return;

    account_list_container.innerHTML = ''; // Clear existing content

    // Enforce the 3-account limit for display purposes
    const accounts_to_display = user_accounts.slice(0, MAX_ACCOUNTS);

    accounts_to_display.forEach(account => {
        const account_item = document.createElement('div');
        account_item.classList.add('account-item');

        account_item.innerHTML = `
            <div class="account-info">
                <div class="info-group">
                    <span class="info-label">Account No.</span>
                    <span class="info-value">${account.number}</span>
                </div>
                <div class="info-group">
                    <span class="info-label">Balance</span>
                    <span class="info-value">₱ ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="info-group">
                    <span class="info-label">Status</span>
                    <span class="info-value account-status ${account.status}">${account.status.charAt(0).toUpperCase() + account.status.slice(1)}</span>
                </div>
            </div>
            <div class="account-actions">
                <button class="three-dots-button" ${account.status === 'closed' ? 'disabled' : ''}> <!-- Disable for closed accounts -->
                    <i class="fas fa-ellipsis-h"></i>
                </button>
                <div class="action-menu hidden">
                    <!-- Menu items will be added by JS on click -->
                </div>
            </div>
        `;

        account_list_container.appendChild(account_item);
    });

    // Add the plus sign placeholder if the account limit is not reached
    if (user_accounts.length < MAX_ACCOUNTS) {
        const add_account_placeholder = document.createElement('div');
        add_account_placeholder.classList.add('add-account-placeholder');
        add_account_placeholder.innerHTML = '<i class="fas fa-plus"></i>';
        account_list_container.appendChild(add_account_placeholder);

        // Add event listener to the placeholder
        add_account_placeholder.addEventListener('click', () => {
            confirmation_modal.classList.remove('hidden');
        });
    }

    // Re-attach event listeners to the newly created three-dots buttons
    attach_three_dots_listeners();
}

// Function to attach listeners to three-dots buttons
function attach_three_dots_listeners() {
    document.querySelectorAll('.three-dots-button:not(:disabled)').forEach(button => { // Only attach to enabled buttons
        // Remove existing listeners to prevent duplicates
        const old_button = button.cloneNode(true);
        button.parentNode.replaceChild(old_button, button);
        const new_button = old_button;

        new_button.addEventListener('click', () => {
            const account_item = new_button.closest('.account-item');
            const account_status_element = account_item.querySelector('.account-status');
            const current_status = account_status_element.textContent.toLowerCase();
            const action_menu = new_button.nextElementSibling; // The action menu is the next sibling

            // Close all other open menus
            document.querySelectorAll('.action-menu').forEach(menu => {
                if (menu !== action_menu) {
                    menu.classList.add('hidden');
                }
            });

            // Clear previous menu items
            action_menu.innerHTML = '';

            // Add menu items based on status
            if (current_status === 'active') {
                action_menu.innerHTML = `
                    <button class="menu-item transfer-button">Transfer</button>
                    <button class="menu-item close-button">Close</button> <!-- Only Transfer and Close -->
                `;
            }
            // No menu items for closed accounts as button is disabled

            // Toggle the visibility of the clicked menu
            action_menu.classList.toggle('hidden');
        });
    });
}

// Add event listeners to menu items (Updated to handle Transfer and Close)
document.addEventListener('click', (event) => {
    const target = event.target;

    if (target.classList.contains('menu-item')) {
        // Close the menu after clicking an item
        target.closest('.action-menu').classList.add('hidden');

        const account_item = target.closest('.account-item');
        const account_status_element = account_item.querySelector('.account-status');
        const account_number = account_item.querySelector('.info-value').textContent; // Get account number

        if (target.classList.contains('transfer-button')) {
            // Redirect to transfer page (can pass account number if needed)
            window.location.href = `transfer.html?account=${account_number}`; // Example: Pass account number as query param
        } else if (target.classList.contains('close-button')) {
            // Show account closed notification and update status (simulated)
            show_notification(`Account ${account_number} closed successfully!`, 'success');
            // In a real application, you would update the backend and then the UI
            // For this example, we will just update the status in the data and re-render
            const account_index = user_accounts.findIndex(account => account.number === account_number);
            if (account_index !== -1) {
                user_accounts[account_index].status = 'closed';
                update_account_display(); // Re-render the list
            }
        }
    }
});

// Close menu when clicking outside
document.addEventListener('click', (event) => {
    const is_three_dots_button = event.target.closest('.three-dots-button');
    const is_action_menu = event.target.closest('.action-menu');
    const is_modal = event.target.closest('.modal-content'); // Don't close menus when clicking inside modals

    if (!is_three_dots_button && !is_action_menu && !is_modal) {
        document.querySelectorAll('.action-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});

// Function to generate a random 12-digit account number (simulation)
function generate_account_number() {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

// Event listeners for Confirmation Modal
confirm_add_account_checkbox.addEventListener('change', () => {
    proceed_add_account_button.disabled = !confirm_add_account_checkbox.checked;
});

proceed_add_account_button.addEventListener('click', () => {
    confirmation_modal.classList.add('hidden');
    otp_modal.classList.remove('hidden');
    // Simulate sending OTP (in a real app, this would be backend)
    console.log('Simulating OTP sent.');
});

cancel_add_account_button.addEventListener('click', () => {
    confirmation_modal.classList.add('hidden');
    confirm_add_account_checkbox.checked = false; // Reset checkbox
    proceed_add_account_button.disabled = true; // Disable proceed button
});

// Event listeners for OTP Modal
verify_otp_button.addEventListener('click', () => {
    const entered_otp = otp_input.value;
    // Simulate OTP verification (in a real app, this would be backend)
    // Check if the entered OTP is a 6-digit number
    if (/^\d{6}$/.test(entered_otp)) {
        // In a real application, you would send the entered OTP to the backend for verification
        // For this simulation, we will assume any 6-digit number is valid
        otp_modal.classList.add('hidden');
        show_notification('Account added successfully!', 'success');

        // Simulate adding a new account
        const new_account_number = generate_account_number();
        const new_account = { number: new_account_number, balance: 0.00, status: 'active' };
        user_accounts.push(new_account);
        update_account_display(); // Update the display with the new account

        otp_input.value = ''; // Clear OTP input

    } else {
        show_notification('Invalid OTP. Please enter a 6-digit number.', 'error');
        otp_input.value = ''; // Clear OTP input
    }
});

cancel_otp_button.addEventListener('click', () => {
    otp_modal.classList.add('hidden');
    otp_input.value = ''; // Clear OTP input
});

// Function to display user initial in the avatar circle
function display_user_initial() {
    const initial = user_data.name.charAt(0).toUpperCase();
    if (user_avatar_container) {
        user_avatar_container.textContent = initial;
    }
}

// Function to setup profile edit interactions
function setup_profile_edit() {
    if (!user_avatar_container || !edit_profile_icon || !edit_profile_modal || !save_profile_button || !exit_profile_button) return;

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
            password: edit_password_input.value, // Handle password securely!
            phone_number: edit_phone_number_input.value,
        };
        console.log('Saving profile data (simulated):', updated_profile_data);

        // Update the displayed name if first or last name changed (simulated)
        user_data.name = `${updated_profile_data.first_name} ${updated_profile_data.last_name}`.trim();
        if (user_name_element) user_name_element.textContent = user_data.name;
        display_user_initial(); // Update the initial

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
     if (!edit_first_name_input || !edit_last_name_input || !edit_username_input || !edit_password_input || !edit_confirm_password_input || !edit_phone_number_input) return;

    edit_first_name_input.value = user_data.first_name || '';
    edit_last_name_input.value = user_data.last_name || '';
    edit_username_input.value = user_data.username || '';
    edit_password_input.value = user_data.password || ''; // Be cautious
    edit_confirm_password_input.value = user_data.password || ''; // Be cautious
    edit_phone_number_input.value = user_data.phone_number || '';
}

// Initial display of account data on page load
document.addEventListener('DOMContentLoaded', () => {
    update_account_display(); // Initial render
    display_user_initial(); // Display user initial on load
    setup_profile_edit(); // Setup profile edit interactions on load
}); 
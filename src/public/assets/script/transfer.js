// DOM Elements
const select_bank_panel = document.getElementById('select-bank-panel');
const account_details_panel = document.getElementById('account-details-panel');
const bank_radio_buttons = document.querySelectorAll('input[name="bank"]');
const next_button = document.getElementById('next-button');
const send_money_button = document.getElementById('send-money-button');
const info_correct_checkbox = document.getElementById('info-correct');
const success_notification = document.createElement('div');
const default_bank_label = document.getElementById('default-bank-label');
const stackovercash_bank_radio = document.getElementById('stackovercash_bank');

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

// Sample User Data (Add registration fields)
let user_data = {
    name: 'Jhon Doe',
    first_name: 'Jhon', // Added for edit form
    last_name: 'Doe', // Added for edit form
    username: 'jhondoe', // Added for edit form
    password: 'password123', // Added for edit form (in a real app, handle securely)
    phone_number: '123-456-7890', // Added for edit form
    // Add other user data as needed
};

// Add success notification element to the body
success_notification.classList.add('success-notification');
success_notification.innerHTML = '<i class="fas fa-check-circle"></i> <span>Money sent successfully!</span>';
document.body.appendChild(success_notification);

// Function to check if a bank is selected
function is_bank_selected() {
    for (const radio of bank_radio_buttons) {
        if (radio.checked) {
            return true;
        }
    }
    return false;
}

// Function to check if info is correct
function is_info_correct() {
    return info_correct_checkbox.checked;
}

// Function to update default label visibility
function update_default_label() {
    if (stackovercash_bank_radio.checked) {
        default_bank_label.style.display = 'block';
    } else {
        default_bank_label.style.display = 'none';
    }
}

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
        const user_name_element = document.getElementById('user_name');
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

// Function to show a notification (Already exists in transfer.js)
function show_notification(message, type) {
    // ... existing code ...
}

// Event listener for radio buttons
bank_radio_buttons.forEach(radio => {
    radio.addEventListener('change', () => {
        next_button.disabled = !is_bank_selected();
        update_default_label();
    });
});

// Event listener for the Next button
next_button.addEventListener('click', () => {
    if (is_bank_selected()) {
        select_bank_panel.style.display = 'none';
        account_details_panel.style.display = 'block';
        // Also check checkbox state when showing this panel
        send_money_button.disabled = !is_info_correct();
    }
});

// Event listener for the Info Correct checkbox
info_correct_checkbox.addEventListener('change', () => {
    send_money_button.disabled = !is_info_correct();
});

// Event listener for the Send Money button
send_money_button.addEventListener('click', () => {
    // Check if button is not disabled (should be redundant due to event listener, but good practice)
    if (!send_money_button.disabled) {
        // In a real application, you would perform the transfer here
        console.log('Sending money...');

        // Show success notification
        success_notification.style.display = 'flex';

        // Hide notification after a few seconds
        setTimeout(() => {
            success_notification.style.display = 'none';
        }, 3000); // Hide after 3 seconds
    }
});

// Initial check on page load
document.addEventListener('DOMContentLoaded', () => {
    next_button.disabled = !is_bank_selected();
    send_money_button.disabled = !is_info_correct(); // Disable send button initially
    update_default_label(); // Set initial state of default label
    display_user_initial(); // Display user initial on load
    setup_profile_edit(); // Setup profile edit interactions on load
}); 
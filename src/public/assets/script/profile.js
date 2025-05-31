// DOM Elements
const user_avatar_container = document.getElementById('user_avatar_container');
const edit_profile_icon = document.getElementById('edit_profile_icon');
const user_name_element = document.getElementById('user_name');

// DOM Elements for Profile Edit Form
const edit_first_name_input = document.getElementById('edit_first_name');
const edit_last_name_input = document.getElementById('edit_last_name');
const edit_username_input = document.getElementById('edit_username');
const edit_password_input = document.getElementById('edit_password');
const edit_confirm_password_input = document.getElementById('edit_confirm_password');
const edit_phone_number_input = document.getElementById('edit_phone_number');
const save_profile_button = document.getElementById('save_profile_button');
const cancel_edit_button = document.getElementById('cancel_edit_button');

// Sample User Data (Add registration fields - consistent with other JS files)
let user_data = {
    name: 'Jhon Doe',
    first_name: 'Jhon', // Added for edit form
    last_name: 'Doe', // Added for edit form
    username: 'jhondoe', // Added for edit form
    password: 'password123', // Added for edit form (in a real app, handle securely)
    phone_number: '123-456-7890', // Added for edit form
    // Add other user data as needed
};

// Function to display user initial in the avatar circle
function display_user_initial() {
    const initial = user_data.name.charAt(0).toUpperCase();
    if (user_avatar_container) {
        user_avatar_container.textContent = initial;
    }
}

// Function to setup profile edit interactions (for the sidebar icon)
function setup_profile_edit_icon() {
    if (!user_avatar_container || !edit_profile_icon) return;

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

    // Redirect to profile page on pen icon click
    edit_profile_icon.addEventListener('click', () => {
        window.location.href = 'profile.html';
    });
}

// Function to populate the profile edit form
function populate_profile_form() {
     if (!edit_first_name_input || !edit_last_name_input || !edit_username_input || !edit_password_input || !edit_confirm_password_input || !edit_phone_number_input) {
         console.error('One or more profile edit form inputs not found!');
         return;
     }

    edit_first_name_input.value = user_data.first_name || '';
    edit_last_name_input.value = user_data.last_name || '';
    edit_username_input.value = user_data.username || '';
    edit_password_input.value = user_data.password || ''; // Be cautious
    edit_confirm_password_input.value = user_data.password || ''; // Be cautious
    edit_phone_number_input.value = user_data.phone_number || '';
}

// Function to show a notification (for consistency)
function show_notification(message, type) {
    const notification_container = document.querySelector('.notification-container');
    if (!notification_container) { // Create if it doesn't exist
        const container = document.createElement('div');
        container.classList.add('notification-container');
        document.body.appendChild(container);
    }
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
    document.querySelector('.notification-container').appendChild(notification);

    // Automatically remove the notification after a few seconds
    setTimeout(() => {
        notification.remove();
    }, 3000); // Hide after 3 seconds
}

// Function to handle form submission (simulated)
function handle_save_profile() {
    const updated_profile_data = {
        first_name: edit_first_name_input.value,
        last_name: edit_last_name_input.value,
        username: edit_username_input.value,
        password: edit_password_input.value, // Handle password securely!
        phone_number: edit_phone_number_input.value,
    };
    console.log('Saving profile data (simulated):', updated_profile_data);

    // In a real application, you would send this data to the backend
    // For this simulation, we'll just update the local user_data
    user_data.first_name = updated_profile_data.first_name;
    user_data.last_name = updated_profile_data.last_name;
    user_data.name = `${user_data.first_name} ${user_data.last_name}`.trim(); // Update full name
    user_data.username = updated_profile_data.username;
    user_data.password = updated_profile_data.password; // Handle securely!
    user_data.phone_number = updated_profile_data.phone_number;

    // Update displayed name in the sidebar (if on profile page)
    if (user_name_element) user_name_element.textContent = user_data.name;
    display_user_initial(); // Update the initial

    show_notification('Profile updated successfully!', 'success');

    // Optionally redirect back to dashboard or another page
    // window.location.href = 'user_dashboard.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    display_user_initial(); // Display user initial on load
    setup_profile_edit_icon(); // Setup profile edit icon interactions
    populate_profile_form(); // Populate form with existing data

    // Add event listeners for buttons
    if (save_profile_button) {
        save_profile_button.addEventListener('click', handle_save_profile);
    }
    if (cancel_edit_button) {
        cancel_edit_button.addEventListener('click', () => {
            // Optionally redirect or reset the form
            console.log('Edit cancelled.');
             show_notification('Edit cancelled.', 'info');
            // window.location.href = 'user_dashboard.html';
        });
    }

    console.log('StackOvercash Profile Page Initialized!');
}); 
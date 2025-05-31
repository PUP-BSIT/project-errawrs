// DOM Elements
const transaction_table_body = document.getElementById('transaction-table-body');
const previous_page_button = document.getElementById('previous-page-button');
const next_page_button = document.getElementById('next-page-button');
const page_numbers_container = document.getElementById('page-numbers');
const items_per_page_select = document.getElementById('items-per-page');
const showing_info_span = document.getElementById('showing-info');
const go_button = document.getElementById('go-button');

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

// Sample Transaction Data (at least 15 items for multiple pages)
const all_transactions = [
    { date: '2025-05-02', account_number: '527491759361', amount: 5000.00, description: 'Over-the-counter', status: 'Success' },
    { date: '2025-05-02', account_number: '123456789012', amount: 2000.00, description: 'To Jane Dee', status: 'Success' },
    { date: '2025-05-01', account_number: '527491759361', amount: 3500.00, description: 'To: BDO - #11223344', status: 'Success' },
    { date: '2025-04-30', account_number: '987654321098', amount: 1000.00, description: 'Cheque Deposit', status: 'Success' },
    { date: '2025-04-29', account_number: '123456789012', amount: 4000.00, description: 'To Acc #2023344556', status: 'Failed' },
    { date: '2025-04-28', account_number: '527491759361', amount: 1500.00, description: 'Mobile Top-up', status: 'Success' },
    { date: '2025-04-27', account_number: '789012345678', amount: 7500.00, description: 'From John Smith', status: 'Success' },
    { date: '2025-04-26', account_number: '987654321098', amount: 200.00, description: 'Utility Payment', status: 'Success' },
    { date: '2025-04-25', account_number: '321098765432', amount: 3000.00, description: 'Online Subscription', status: 'Success' },
    { date: '2025-04-24', account_number: '527491759361', amount: 500.00, description: 'ATM Withdrawal', status: 'Success' },
    { date: '2025-04-23', account_number: '123456789012', amount: 6000.00, description: 'To Mary Jones', status: 'Success' },
    { date: '2025-04-22', account_number: '789012345678', amount: 1200.00, description: 'Fund Transfer', status: 'Success' },
    { date: '2025-04-21', account_number: '321098765432', amount: 2500.00, description: 'Online Purchase', status: 'Success' },
    { date: '2025-04-20', account_number: '527491759361', amount: 800.00, description: 'Groceries', status: 'Success' },
    { date: '2025-04-19', account_number: '123456789012', amount: 10000.00, description: 'From Company Payroll', status: 'Success' },
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

// Pagination state
let current_page = 1;
let items_per_page = parseInt(items_per_page_select.value);
const total_items = all_transactions.length;

// Function to display transactions for a given page
function display_transactions(page) {
    current_page = page;
    const start_index = (current_page - 1) * items_per_page;
    const end_index = start_index + items_per_page;
    const transactions_to_display = all_transactions.slice(start_index, end_index);

    // Clear current table body
    transaction_table_body.innerHTML = '';

    // Populate table with transactions
    transactions_to_display.forEach(transaction => {
        const row = document.createElement('tr');

        // Date
        const date_td = document.createElement('td');
        date_td.textContent = transaction.date;
        row.appendChild(date_td);

        // Account Number
        const account_td = document.createElement('td');
        account_td.textContent = transaction.account_number;
        row.appendChild(account_td);

        // Amount
        const amount_td = document.createElement('td');
        // Format amount with ₱ and two decimal places
        amount_td.textContent = `₱${transaction.amount.toFixed(2)}`;
        row.appendChild(amount_td);

        // Description
        const description_td = document.createElement('td');
        description_td.textContent = transaction.description;
        row.appendChild(description_td);

        // Status
        const status_td = document.createElement('td');
        const status_span = document.createElement('span');
        status_span.classList.add(`status-${transaction.status.toLowerCase()}`);
        const icon_class = transaction.status === 'Success' ? 'fas fa-check-circle' : 'fas fa-times-circle';
        status_span.innerHTML = `<i class="${icon_class}"></i> ${transaction.status}`;
        status_td.appendChild(status_span);
        row.appendChild(status_td);

        transaction_table_body.appendChild(row);
    });

    update_pagination_controls();
}

// Function to update pagination controls
function update_pagination_controls() {
    const total_pages = Math.ceil(total_items / items_per_page);

    // Update page numbers
    page_numbers_container.innerHTML = '';
    const max_visible_pages = 3; // Number of page buttons to show
    const start_page = Math.max(1, current_page - Math.floor(max_visible_pages / 2));
    const end_page = Math.min(total_pages, start_page + max_visible_pages - 1);

    for (let i = start_page; i <= end_page; i++) {
        const page_button = document.createElement('button');
        page_button.textContent = i;
        if (i === current_page) {
            page_button.classList.add('active');
        }
        page_button.addEventListener('click', () => display_transactions(i));
        page_numbers_container.appendChild(page_button);
    }

    // Update previous/next button state
    previous_page_button.disabled = current_page === 1;
    next_page_button.disabled = current_page === total_pages;

    // Update showing info
    const start_item = (current_page - 1) * items_per_page + 1;
    const end_item = Math.min(current_page * items_per_page, total_items);
    showing_info_span.textContent = `Showing ${start_item} to ${end_item} of ${total_items}`;
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

// Function to show a notification (Copied from transfer.js)
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

// Event listeners for pagination buttons
previous_page_button.addEventListener('click', () => {
    if (current_page > 1) {
        display_transactions(current_page - 1);
    }
});

next_page_button.addEventListener('click', () => {
    const total_pages = Math.ceil(total_items / items_per_page);
    if (current_page < total_pages) {
        display_transactions(current_page + 1);
    }
});

// Event listener for items per page select
items_per_page_select.addEventListener('change', () => {
    items_per_page = parseInt(items_per_page_select.value);
    display_transactions(1); // Go back to the first page when items per page changes
});

// Event listener for Go button (optional, could be used for a specific page number input)
go_button.addEventListener('click', () => {
    // Implement logic to go to a specific page if you add an input field
    console.log('Go button clicked');
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    display_transactions(1); // Display the first page on load
    display_user_initial(); // Display user initial on load
    setup_profile_edit(); // Setup profile edit interactions on load
}); 
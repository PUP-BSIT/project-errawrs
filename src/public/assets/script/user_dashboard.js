// DOM Elements
const nav_links = document.querySelectorAll('.nav-link');
const logout_btn = document.getElementById('logout_btn');
const notification_btn = document.getElementById('notification_btn');
const add_btn = document.getElementById('add_btn');
const help_btn = document.getElementById('help_btn');
const transfer_now_btn = document.getElementById('transfer_now_btn');
const account_balance = document.getElementById('account_balance');
const transaction_list = document.getElementById('transaction_list');
const user_name = document.getElementById('user_name');
const account_display_container = document.getElementById('account-display-container');

// Sample Account Data (matching the account panel data)
const user_accounts = [
    { number: '527491759361', balance: 3691.00, status: 'active' },
    { number: '123456789012', balance: 10500.50, status: 'active' },
    { number: '987654321098', balance: 500.25, status: 'closed' },
    { number: '456789123456', balance: 15000.00, status: 'active' },
    { number: '789012345678', balance: 7200.75, status: 'closed' },
    { number: '321098765432', balance: 2900.00, status: 'active' },
];

// User Data (Keep existing user_data structure, but update balance based on selected account)
let user_data = {
    name: 'Jhon Doe',
    // balance will be updated dynamically
    currency: '₱',
    transactions: [
        {
            date: '2025-05-02',
            amount: 30000.0,
            type: 'credit',
            description: 'Salary Deposit',
            account_number: '527491759361'
        },
        {
            date: '2025-05-01',
            amount: -5000.0,
            type: 'debit',
            description: 'ATM Withdrawal',
            account_number: '123456789012'
        },
        {
            date: '2025-04-31',
            amount: -10000.0,
            type: 'debit',
            description: 'Online Purchase',
            account_number: '527491759361'
        },
        {
            date: '2025-05-03',
            amount: 2500.0,
            type: 'credit',
            description: 'Refund',
            account_number: '123456789012'
        },
        {
            date: '2025-05-04',
            amount: -500.0,
            type: 'debit',
            description: 'Coffee',
            account_number: '527491759361'
        }
    ],
};

// Initialize Dashboard
function init_dashboard() {
    load_recent_transactions();
    setup_smooth_animations();
    setup_account_display(); // New function to handle account display

    console.log('StackOvercash Dashboard Initialized');
}

// Function to setup account number display and dropdown
function setup_account_display() {
    console.log('setup_account_display function started');
    const account_display_container = document.getElementById('account-display-container');
    if (!account_display_container) {
        console.error('#account-display-container not found!');
        return; // Exit if container not found
    }
    account_display_container.innerHTML = ''; // Clear existing content
    console.log('account_display_container cleared');

    // Filter out closed accounts
    const active_accounts = user_accounts.filter(account => account.status === 'active');

    // Check if there are any active accounts
    if (!active_accounts || active_accounts.length === 0) {
        console.log('No active accounts available to display.');
        const no_account_message = document.createElement('span');
        no_account_message.textContent = 'No active accounts linked';
        no_account_message.style.color = 'rgba(255, 255, 255, 0.8)';
        account_display_container.appendChild(no_account_message);
        console.log('No active linked accounts message appended.');
        update_balance_display(0); // Display zero balance
        console.log('Balance updated to 0.');
        return;
    }

    // Use active_accounts for display logic
    if (active_accounts.length === 1) {
        console.log('One active account found, displaying single account number.');
        const account_number_span = document.createElement('span');
        account_number_span.classList.add('account-number-display');
        account_number_span.textContent = `Account No. ${active_accounts[0].number}`;
        account_display_container.appendChild(account_number_span);
        console.log('Single active account number span appended.');
        update_balance_display(active_accounts[0].balance);
        console.log(`Balance updated for account ${active_accounts[0].number}`);
    } else {
        console.log(`Multiple active accounts (${active_accounts.length}) found, displaying dropdown.`);
        const select_container = document.createElement('div');
        select_container.classList.add('account-select-container');
        console.log('Select container created.');

        const account_select = document.createElement('select');
        account_select.id = 'account-select';
        console.log('Account select created.');

        active_accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.number;
            option.textContent = `Account No. ${account.number}`;
            account_select.appendChild(option);
            console.log(`Option for account ${account.number} appended to select.`);
        });

        const select_arrow = document.createElement('i');
        select_arrow.classList.add('fas', 'fa-angle-down', 'select-arrow');
        console.log('Select arrow icon created.');

        select_container.appendChild(account_select);
        console.log('Account select appended to container.');
        select_container.appendChild(select_arrow);
        console.log('Select arrow appended to container.');
        account_display_container.appendChild(select_container);
        console.log('Select container appended to account_display_container.');

        // Set initial balance to the first account in the list
        update_balance_display(active_accounts[0].balance);
        console.log(`Initial balance updated for active account ${active_accounts[0].number}`);

        // Add event listener to update balance on select change
        account_select.addEventListener('change', (event) => {
            console.log('Account select changed.');
            const selected_account_number = event.target.value;
            const selected_account = active_accounts.find(account => account.number === selected_account_number);
            if (selected_account) {
                update_balance_display(selected_account.balance);
                console.log(`Balance updated for selected account ${selected_account.number}`);
                load_recent_transactions(); // Reload transactions for the newly selected account
            } else {
                console.log(`Selected account ${selected_account_number} not found.`);
            }
        });
    }
}

// Update Balance Display (Modified to accept balance as argument)
function update_balance_display(balance) {
    console.log(`Attempting to update balance display with ${balance}`);
    const account_balance_element = document.getElementById('account_balance');
    if (account_balance_element) {
        // Update the user_data balance to reflect the currently displayed account
        user_data.balance = balance;
        const formatted_balance = format_currency_exact(user_data.balance);
        account_balance_element.textContent = formatted_balance;
        console.log(`Balance element updated to ${formatted_balance}`);
    } else {
        console.error('#account_balance element not found!');
    }
}

// Format Currency - Exact Match
function format_currency_exact(amount) {
     console.log(`Formatting amount: ${amount}`);
    return `${user_data.currency} ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// Load Recent Transactions - Exact Match (Kept for now, but would ideally be linked to selected account)
function load_recent_transactions() {
     console.log('Loading recent transactions...');
    if (!transaction_list) {
         console.error('#transaction_list element not found!');
        return;
    }

    // Clear existing transactions
    transaction_list.innerHTML = '';
     console.log('Transaction list cleared.');

    // Get the currently selected account number from the dropdown
    const account_select = document.getElementById('account-select');
    let selected_account_number = null;
    if (account_select) {
        selected_account_number = account_select.value;
    } else {
        // If there's no dropdown (only one active account), get the number from the display span
        const account_number_span = document.querySelector('.account-number-display');
        if (account_number_span) {
            selected_account_number = account_number_span.textContent.replace('Account No. ', '');
        }
    }

    // Filter transactions for the selected account
    const filtered_transactions = user_data.transactions.filter(transaction => 
        transaction.account_number === selected_account_number
    );

    // Add each filtered transaction
    filtered_transactions.forEach((transaction) => {
        const transaction_element =
            create_transaction_element_exact(transaction);
        transaction_list.appendChild(transaction_element);
         console.log(`Appended transaction: ${transaction.description} for account ${transaction.account_number}`);
    });
     console.log('Finished loading filtered recent transactions.');
}

// Create Transaction Element - Exact Match
function create_transaction_element_exact(transaction) {
     console.log(`Creating transaction element for: ${transaction.description}`);
    const item = document.createElement('div');
    item.className = 'transaction-item';

    // Date element
    const date_span = document.createElement('span');
    date_span.className = 'transaction-date';
    date_span.textContent = transaction.date;

    // Amount element
    const amount_span = document.createElement('span');
    const amount_class = transaction.amount > 0 ? 'positive' : 'negative';
    amount_span.className = `transaction-amount ${amount_class}`;

    // Format amount exactly like the image
    const formatted_amount =
        transaction.amount > 0
            ? `+${user_data.currency}${Math.abs(
                  transaction.amount
              ).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              })}`
            : `-${user_data.currency}${Math.abs(
                  transaction.amount
              ).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              })}`;

    amount_span.textContent = formatted_amount;

    // Add elements to item
    item.appendChild(date_span);
    item.appendChild(amount_span);

    // Add hover effect
    add_transaction_hover_effect(item);

    return item;
}

// Add Transaction Hover Effect
function add_transaction_hover_effect(item) {
     console.log('Adding hover effect to transaction item.');
    item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'rgba(126, 217, 87, 0.1)';
        item.style.borderRadius = '8px';
        item.style.transition = 'all 0.2s ease';
    });

    item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
    });
}

// Setup Smooth Animations
function setup_smooth_animations() {
     console.log('Setting up smooth animations.');
    // Add entrance animations to cards
    const cards = document.querySelectorAll(
        '.balance-card, .financial-tip, .transactions-card'
    );

    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * (index + 1));
    });

    // Add subtle pulse to balance amount
    if (account_balance) {
         console.log('Setting up balance pulse animation.');
        setInterval(() => {
            account_balance.style.transform = 'scale(1.02)';
            setTimeout(() => {
                account_balance.style.transform = 'scale(1)';
            }, 200);
        }, 5000);
    }
     console.log('Smooth animations setup complete.');
}

// Simulate Logout
function simulate_logout() {
     console.log('Simulating logout.');
    // Add logout animation
    const dashboard = document.querySelector('.dashboard-container');

    if (dashboard) {
        dashboard.style.transition = 'opacity 0.5s ease';
        dashboard.style.opacity = '0';

        setTimeout(() => {
            alert(
                'Logged out successfully!\n\nThank you for using StackOvercash.'
            );
            dashboard.style.opacity = '1';
             console.log('Logout animation complete, alert shown.');
        }, 500);
    }
}

// Add Real-time Clock (Optional Enhancement)
function update_current_time() {
     console.log('Updating current time...');
    const now = new Date();
    const time_string = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
    });

    // You can add this to header if needed
    console.log(`Current time: ${time_string}`);
}

// Update Balance with Animation
function update_balance_with_animation(new_balance) {
     console.log(`Attempting to update balance with animation to ${new_balance}`);
    const account_balance_element = document.getElementById('account_balance');
    if (!account_balance_element) {
         console.error('#account_balance element not found for animation!');
        return;
    }

    const current_balance = user_data.balance;
    const difference = new_balance - current_balance;

    // Animate balance change
    account_balance_element.style.transform = 'scale(1.1)';
    account_balance_element.style.color = difference > 0 ? '#28a745' : '#dc3545';

    setTimeout(() => {
        user_data.balance = new_balance;
        update_balance_display(user_data.balance); // Call the updated display function

        account_balance_element.style.transform = 'scale(1)';
        account_balance_element.style.color = '#ffffff';
         console.log('Balance animation complete.');
    }, 300);
}

// Keyboard Shortcuts
function setup_keyboard_shortcuts() {
     console.log('Setting up keyboard shortcuts.');
    document.addEventListener('keydown', (e) => {
        // Alt + T for Transfer
        if (e.altKey && e.key === 't') {
            e.preventDefault();
             console.log('Keyboard shortcut: Alt + T');
            handle_transfer_click();
        }

        // Alt + H for Help
        if (e.altKey && e.key === 'h') {
            e.preventDefault();
             console.log('Keyboard shortcut: Alt + H');
            handle_help_click();
        }

        // Alt + N for Notifications
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
             console.log('Keyboard shortcut: Alt + N');
            handle_notification_click();
        }
    });
     console.log('Keyboard shortcuts setup complete.');
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
     console.log('DOM fully loaded, initializing dashboard.');
    init_dashboard();
    setup_keyboard_shortcuts();

    // Start time updates
    setInterval(update_current_time, 60000);

    console.log('StackOvercash Banking Dashboard fully loaded and ready!');
});

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
const user_avatar_container = document.getElementById('user_avatar_container');

// Sample Account Data (matching the account panel data)
const user_accounts = [
    { number: '527491759361', balance: 3691.00, status: 'active' },
    { number: '123456789012', balance: 10500.50, status: 'active' },
    { number: '987654321098', balance: 500.25, status: 'closed' },
    { number: '456789123456', balance: 15000.00, status: 'active' },
    { number: '789012345678', balance: 7200.75, status: 'closed' },
    { number: '321098765432', balance: 2900.00, status: 'active' },
];

// User Data
let user_data = {
    name: 'Jhon Doe',
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
    setup_account_display();
    display_user_initial();

    console.log('StackOvercash Dashboard Initialized');
}

// Function to setup account number display and dropdown
function setup_account_display() {
    console.log('setup_account_display function started');
    const account_display_container = document.getElementById('account-display-container');
    if (!account_display_container) {
        console.error('#account-display-container not found!');
        return;
    }
    account_display_container.innerHTML = '';

    // Filter out closed accounts
    const active_accounts = user_accounts.filter(account => account.status === 'active');

    // Check if there are any active accounts
    if (!active_accounts || active_accounts.length === 0) {
        console.log('No active accounts available to display.');
        const no_account_message = document.createElement('span');
        no_account_message.textContent = 'No active accounts linked';
        no_account_message.style.color = 'rgba(255, 255, 255, 0.8)';
        account_display_container.appendChild(no_account_message);
        update_balance_display(0);
        return;
    }

    // Use active_accounts for display logic
    if (active_accounts.length === 1) {
        console.log('One active account found, displaying single account number.');
        const account_number_span = document.createElement('span');
        account_number_span.classList.add('account-number-display');
        account_number_span.textContent = `Account No. ${active_accounts[0].number}`;
        account_display_container.appendChild(account_number_span);
        update_balance_display(active_accounts[0].balance);
    } else {
        console.log(`Multiple active accounts (${active_accounts.length}) found, displaying dropdown.`);
        const select_container = document.createElement('div');
        select_container.classList.add('account-select-container');

        const account_select = document.createElement('select');
        account_select.id = 'account-select';

        active_accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.number;
            option.textContent = `Account No. ${account.number}`;
            account_select.appendChild(option);
        });

        const select_arrow = document.createElement('i');
        select_arrow.classList.add('fas', 'fa-angle-down', 'select-arrow');

        select_container.appendChild(account_select);
        select_container.appendChild(select_arrow);
        account_display_container.appendChild(select_container);

        // Set initial balance to the first account in the list
        update_balance_display(active_accounts[0].balance);

        // Add event listener to update balance on select change
        account_select.addEventListener('change', (event) => {
            const selected_account_number = event.target.value;
            const selected_account = active_accounts.find(account => account.number === selected_account_number);
            if (selected_account) {
                update_balance_display(selected_account.balance);
                load_recent_transactions();
            }
        });
    }
}

// Update Balance Display
function update_balance_display(balance) {
    console.log(`Attempting to update balance display with ${balance}`);
    const account_balance_element = document.getElementById('account_balance');
    if (account_balance_element) {
        user_data.balance = balance;
        const formatted_balance = format_currency_exact(user_data.balance);
        account_balance_element.textContent = formatted_balance;
    } else {
        console.error('#account_balance element not found!');
    }
}

// Format Currency - Exact Match
function format_currency_exact(amount) {
    return `${user_data.currency} ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// Load Recent Transactions
function load_recent_transactions() {
    if (!transaction_list) {
        console.error('#transaction_list element not found!');
        return;
    }

    transaction_list.innerHTML = '';

    const account_select = document.getElementById('account-select');
    let selected_account_number = null;
    if (account_select) {
        selected_account_number = account_select.value;
    } else {
        const account_number_span = document.querySelector('.account-number-display');
        if (account_number_span) {
            selected_account_number = account_number_span.textContent.replace('Account No. ', '');
        }
    }

    const filtered_transactions = user_data.transactions.filter(transaction => 
        transaction.account_number === selected_account_number
    );

    filtered_transactions.forEach((transaction) => {
        const transaction_element = create_transaction_element_exact(transaction);
        transaction_list.appendChild(transaction_element);
    });
}

// Create Transaction Element
function create_transaction_element_exact(transaction) {
    const item = document.createElement('div');
    item.className = 'transaction-item';

    const date_span = document.createElement('span');
    date_span.className = 'transaction-date';
    date_span.textContent = transaction.date;

    const amount_span = document.createElement('span');
    const amount_class = transaction.amount > 0 ? 'positive' : 'negative';
    amount_span.className = `transaction-amount ${amount_class}`;

    const formatted_amount = transaction.amount > 0
        ? `+${user_data.currency}${Math.abs(transaction.amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`
        : `-${user_data.currency}${Math.abs(transaction.amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    amount_span.textContent = formatted_amount;

    item.appendChild(date_span);
    item.appendChild(amount_span);

    add_transaction_hover_effect(item);

    return item;
}

// Add Transaction Hover Effect
function add_transaction_hover_effect(item) {
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

    if (account_balance) {
        setInterval(() => {
            account_balance.style.transform = 'scale(1.02)';
            setTimeout(() => {
                account_balance.style.transform = 'scale(1)';
            }, 200);
        }, 5000);
    }
}

// Function to display user initial in the avatar circle
function display_user_initial() {
    const initial = user_data.name.charAt(0).toUpperCase();
    if (user_avatar_container) {
        user_avatar_container.textContent = initial;
    }
}

// Add Function to show a notification
function show_notification(message, type) {
    const notification_container = document.querySelector('.notification-container');
    if (!notification_container) {
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

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing dashboard.');
    init_dashboard();
    setup_keyboard_shortcuts();
    setInterval(update_current_time, 60000);
    console.log('StackOvercash Banking Dashboard fully loaded and ready!');
});

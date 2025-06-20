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

// User Data - Exact Match
let user_data = {
    name: 'Jhon Doe',
    balance: 7610.1,
    currency: '₱',
    transactions: [
        {
            date: '2025-05-02',
            amount: 30000.0,
            type: 'credit',
            description: 'Salary Deposit',
        },
        {
            date: '2025-05-01',
            amount: -5000.0,
            type: 'debit',
            description: 'ATM Withdrawal',
        },
        {
            date: '2025-04-31',
            amount: -10000.0,
            type: 'debit',
            description: 'Online Purchase',
        },
    ],
};

// Initialize Dashboard
function init_dashboard() {
    setup_navigation();
    setup_button_handlers();
    update_balance_display();
    load_recent_transactions();
    setup_smooth_animations();

    console.log('StackOvercash Dashboard Initialized');
}

// Navigation Setup
function setup_navigation() {
    nav_links.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all nav items
            document
                .querySelectorAll('.nav-item')
                .forEach((item) => item.classList.remove('active'));

            // Add active class to clicked item
            link.parentElement.classList.add('active');

            // Get page data and handle navigation
            const page = link.getAttribute('data-page');
            handle_page_navigation(page);
        });
    });
}

// Handle Page Navigation
function handle_page_navigation(page) {
    console.log(`Navigating to: ${page}`);

    // Add visual feedback
    add_navigation_feedback();

    switch (page) {
        case 'dashboard':
            show_dashboard_view();
            break;
        case 'transfer':
            show_transfer_view();
            break;
        case 'transaction':
            show_transaction_view();
            break;
        case 'account':
            show_account_view();
            break;
        default:
            console.log('Unknown page requested');
    }
}

// Add Navigation Feedback
function add_navigation_feedback() {
    const active_link = document.querySelector('.nav-item.active .nav-link');
    if (active_link) {
        active_link.style.transform = 'scale(0.98)';
        setTimeout(() => {
            active_link.style.transform = 'scale(1)';
        }, 150);
    }
}

// Show Dashboard View
function show_dashboard_view() {
    console.log('Dashboard view active');
    // Dashboard is already visible - no action needed
}

// Show Transfer View
function show_transfer_view() {
    console.log('Transfer view requested');
    show_feature_coming_soon('Transfer');
}

// Show Transaction View
function show_transaction_view() {
    console.log('Transaction view requested');
    show_feature_coming_soon('Transaction History');
}

// Show Account View
function show_account_view() {
    console.log('Account view requested');
    show_feature_coming_soon('Account Settings');
}

// Show Feature Coming Soon
function show_feature_coming_soon(feature_name) {
    const message =
        `${feature_name} feature is coming soon!\n\n` +
        'This is a demo interface matching the original design.';
    alert(message);
}

// Button Event Handlers Setup
function setup_button_handlers() {
    // Logout Button
    if (logout_btn) {
        logout_btn.addEventListener('click', handle_logout_click);
    }

    // Notification Button
    if (notification_btn) {
        notification_btn.addEventListener('click', handle_notification_click);
    }

    // Add Button
    if (add_btn) {
        add_btn.addEventListener('click', handle_add_click);
    }

    // Help Button
    if (help_btn) {
        help_btn.addEventListener('click', handle_help_click);
    }

    // Transfer Now Button
    if (transfer_now_btn) {
        transfer_now_btn.addEventListener('click', handle_transfer_click);
    }
}

// Handle Logout Click
function handle_logout_click() {
    add_button_feedback(logout_btn);

    const confirm_logout = confirm(
        'Are you sure you want to log out of StackOvercash?'
    );

    if (confirm_logout) {
        console.log('User logging out...');
        simulate_logout();
    }
}

// Handle Notification Click
function handle_notification_click() {
    add_button_feedback(notification_btn);

    const notifications = [
        '🏦 Bank holiday notice updated',
        '💰 Monthly statement available',
        '🔒 Security update completed',
    ];

    const message = 'Recent Notifications:\n\n' + notifications.join('\n');
    alert(message);
}

// Handle Add Click
function handle_add_click() {
    add_button_feedback(add_btn);

    const options = [
        'Add New Account',
        'Add Beneficiary',
        'Add Card',
        'Add Goal',
    ];

    const message =
        'Quick Add Options:\n\n' +
        options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    alert(message);
}

// Handle Help Click
function handle_help_click() {
    add_button_feedback(help_btn);

    const help_info = [
        '💡 Dashboard shows your current balance',
        '📊 Recent transactions are listed on the right',
        '💸 Use Transfer Now for quick transfers',
        '📞 Contact: support@stackovercash.com',
    ];

    const message = 'StackOvercash Help:\n\n' + help_info.join('\n');
    alert(message);
}

// Handle Transfer Click
function handle_transfer_click() {
    add_button_feedback(transfer_now_btn);

    console.log('Transfer initiated');

    const transfer_message =
        'Transfer Feature\n\n' +
        'Current Balance: ₱ 7,610.10\n\n' +
        'This would open the transfer interface\n' +
        'where you can send money to other accounts.';

    alert(transfer_message);
}

// Add Button Feedback Animation
function add_button_feedback(button) {
    if (!button) return;

    button.style.transform = 'scale(0.95)';
    button.style.transition = 'transform 0.1s ease';

    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 100);
}

// Update Balance Display
function update_balance_display() {
    if (account_balance) {
        const formatted_balance = format_currency_exact(user_data.balance);
        account_balance.textContent = formatted_balance;
    }
}

// Format Currency - Exact Match
function format_currency_exact(amount) {
    return `${user_data.currency} ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// Load Recent Transactions - Exact Match
function load_recent_transactions() {
    if (!transaction_list) return;

    // Clear existing transactions
    transaction_list.innerHTML = '';

    // Add each transaction
    user_data.transactions.forEach((transaction) => {
        const transaction_element =
            create_transaction_element_exact(transaction);
        transaction_list.appendChild(transaction_element);
    });
}

// Create Transaction Element - Exact Match
function create_transaction_element_exact(transaction) {
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
    item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'rgba(126, 217, 87, 0.1)';
        item.style.borderRadius = '8px';
        item.style.transition = 'all 0.2s ease';
    });

    item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
    });

    item.addEventListener('click', () => {
        const date = item.querySelector('.transaction-date').textContent;
        const amount = item.querySelector('.transaction-amount').textContent;

        const transaction_details = user_data.transactions.find(
            (t) => t.date === date
        );

        if (transaction_details) {
            const detail_message =
                `Transaction Details\n\n` +
                `Date: ${transaction_details.date}\n` +
                `Amount: ${amount}\n` +
                `Description: ${transaction_details.description}\n` +
                `Type: ${transaction_details.type.toUpperCase()}`;

            alert(detail_message);
        }
    });
}

// Setup Smooth Animations
function setup_smooth_animations() {
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
        setInterval(() => {
            account_balance.style.transform = 'scale(1.02)';
            setTimeout(() => {
                account_balance.style.transform = 'scale(1)';
            }, 200);
        }, 5000);
    }
}

// Simulate Logout
function simulate_logout() {
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
        }, 500);
    }
}

// Add Real-time Clock (Optional Enhancement)
function update_current_time() {
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
    if (!account_balance) return;

    const current_balance = user_data.balance;
    const difference = new_balance - current_balance;

    // Animate balance change
    account_balance.style.transform = 'scale(1.1)';
    account_balance.style.color = difference > 0 ? '#28a745' : '#dc3545';

    setTimeout(() => {
        user_data.balance = new_balance;
        update_balance_display();

        account_balance.style.transform = 'scale(1)';
        account_balance.style.color = '#ffffff';
    }, 300);
}

// Keyboard Shortcuts
function setup_keyboard_shortcuts() {
    document.addEventListener('keydown', (e) => {
        // Alt + T for Transfer
        if (e.altKey && e.key === 't') {
            e.preventDefault();
            handle_transfer_click();
        }

        // Alt + H for Help
        if (e.altKey && e.key === 'h') {
            e.preventDefault();
            handle_help_click();
        }

        // Alt + N for Notifications
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            handle_notification_click();
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    init_dashboard();
    setup_keyboard_shortcuts();

    // Start time updates
    setInterval(update_current_time, 60000);

    console.log('StackOvercash Banking Dashboard fully loaded and ready!');
});

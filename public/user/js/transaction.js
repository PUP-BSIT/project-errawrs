const ELEMENT_ID = {
    TRANSACTION_TABLE_BODY: 'transaction-table-body',
    PREVIOUS_PAGE_BUTTON: 'previous-page-button',
    NEXT_PAGE_BUTTON: 'next-page-button',
    PAGE_NUMBERS: 'page-numbers',
    ITEMS_PER_PAGE: 'items-per-page',
    SHOWING_INFO: 'showing-info',
    GO_BUTTON: 'go-button',
    USER_AVATAR_CONTAINER: 'user_avatar_container',
    USER_NAME: 'user_name',
    WELCOME_USER_NAME: 'welcome_user_name',
};

const CLASS = {
    NOTIFICATION: 'notification',
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    POSITIVE: 'positive',
    NEGATIVE: 'negative',
    PAGE_NUMBER: 'page-number',
    ACTIVE: 'active',
    CENTERED: 'centered',
    PADDED: 'padded',
};

// Icons
const ICON = {
    SUCCESS: 'fas fa-check-circle',
    ERROR: 'fas fa-times-circle',
    INFO: 'fas fa-info-circle',
    BELL: 'fas fa-bell',
};

// Text Content
const TEXT = {
    NO_TRANSACTIONS: 'No transactions found.',
    SESSION_EXPIRED: 'Session expired or invalid',
    USER_DATA_ERROR: 'Error fetching user data',
    FETCH_ERROR: 'Failed to fetch transactions',
    TRANSACTIONS_ERROR: 'Error fetching transactions',
    SHOWING_ZERO: 'Showing 0 of 0',
    NA: 'N/A',
    UNKNOWN: 'Unknown',
};

// Currency
const CURRENCY = {
    SYMBOL: '₱',
    LOCALE: 'en-US',
};

// Timing (in milliseconds)
const TIMING = {
    NOTIFICATION_DURATION: 3000,
    REDIRECT_DELAY: 2000,
};

// Pagination defaults
const PAGINATION = {
    DEFAULT_ITEMS_PER_PAGE: 10,
    DEFAULT_PAGE: 1,
};

// DOM Elements
const transaction_table_body = document.getElementById(
    ELEMENT_ID.TRANSACTION_TABLE_BODY
);
const previous_page_button = document.getElementById(
    ELEMENT_ID.PREVIOUS_PAGE_BUTTON
);
const next_page_button = document.getElementById(ELEMENT_ID.NEXT_PAGE_BUTTON);
const page_numbers_container = document.getElementById(ELEMENT_ID.PAGE_NUMBERS);
const items_per_page_select = document.getElementById(
    ELEMENT_ID.ITEMS_PER_PAGE
);
const showing_info_span = document.getElementById(ELEMENT_ID.SHOWING_INFO);
const go_button = document.getElementById(ELEMENT_ID.GO_BUTTON);

// DOM Elements for Profile Edit
const user_avatar_container = document.getElementById(
    ELEMENT_ID.USER_AVATAR_CONTAINER
);

const user_name_element = document.getElementById(ELEMENT_ID.USER_NAME);
const welcome_user_name_element = document.getElementById(
    ELEMENT_ID.WELCOME_USER_NAME
); // Assuming this element might be on transaction page for consistency

// State for Pagination
let currentPage = PAGINATION.DEFAULT_PAGE;
let itemsPerPage = parseInt(
    items_per_page_select
        ? items_per_page_select.value
        : PAGINATION.DEFAULT_ITEMS_PER_PAGE,
    10
);
let totalTransactions = 0;
let totalPages = 0;

// Utility: detect mobile
function isMobile() {
    return window.innerWidth <= 600;
}

// State
let user_data = null;
let transactions = [];

function showNotification(message, type) {
    const notification_container = document.querySelector(
        '.notification-container'
    );
    if (!notification_container) return;

    const notification = document.createElement('div');
    notification.classList.add(CLASS.NOTIFICATION, type);

    let icon = '';
    switch (type) {
        case CLASS.SUCCESS:
            icon = ICON.SUCCESS;
            break;
        case CLASS.ERROR:
            icon = ICON.ERROR;
            break;
        case CLASS.INFO:
            icon = ICON.INFO;
            break;
        default:
            icon = ICON.BELL;
    }

    notification.innerHTML = `
         <i class="${icon}"></i>
         <span>${message}</span>
     `;

    notification_container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, TIMING.NOTIFICATION_DURATION);
}

// Fetch user data from API
async function fetchUserData() {
    try {
        const response = await fetch(API_ENDPOINTS.AUTH.SESSION_CHECK);
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
            showNotification(data.error || TEXT.SESSION_EXPIRED, CLASS.ERROR);

            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, TIMING.REDIRECT_DELAY);
        }
    } catch (error) {
        showNotification(TEXT.USER_DATA_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Fetch transaction data from API
async function fetchTransactions() {
    // On mobile, always use 3 per page
    if (isMobile()) {
        itemsPerPage = 3;
        if (items_per_page_select) items_per_page_select.value = 3;
    } else {
        itemsPerPage = parseInt(
            items_per_page_select
                ? items_per_page_select.value
                : PAGINATION.DEFAULT_ITEMS_PER_PAGE,
            10
        );
    }
    try {
        const response = await fetch(
            `${API_ENDPOINTS.USER.TRANSACTIONS}?page=${currentPage}&limit=${itemsPerPage}`
        );
        const data = await response.json();

        if (data.success) {
            totalTransactions = data.total || 0;
            totalPages = Math.ceil(totalTransactions / itemsPerPage);
            renderTransactions(data.transactions || []);
            updatePaginationInfo();
            updatePaginationButtons();
            renderPageNumbers();
        } else {
            showNotification(data.error || TEXT.FETCH_ERROR, CLASS.ERROR);
            renderTransactions([]);
            totalTransactions = 0;
            totalPages = 0;
            updatePaginationInfo();
            updatePaginationButtons();
            renderPageNumbers();
        }
    } catch (error) {
        showNotification(TEXT.TRANSACTIONS_ERROR, CLASS.ERROR);
        console.error('Error:', error);
        renderTransactions([]);
        totalTransactions = 0;
        totalPages = 0;
        updatePaginationInfo();
        updatePaginationButtons();
        renderPageNumbers();
    }
}

// Render transactions in the table
function renderTransactions(transactions) {
    if (!transaction_table_body) return;

    transaction_table_body.innerHTML = '';

    if (transactions.length === 0) {
        transaction_table_body.innerHTML = `
            <tr>
                <td colspan="5" class="centered padded">${TEXT.NO_TRANSACTIONS}</td>
            </tr>
        `;
        return;
    }

    transactions.forEach((transaction) => {
        const row = document.createElement('tr');
        const amount = parseFloat(transaction.amount);
        const amountClass = amount >= 0 ? CLASS.POSITIVE : CLASS.NEGATIVE;
        let description = transaction.description || TEXT.NA;
        // Determine transaction type and description
        if (transaction.type === 'transfer_internal') {
            if (amount > 0) {
                description = `Received money from ${transaction.sender_account_number}`;
            } else {
                description = `Sent money to ${transaction.receiver_account_number}`;
            }
        } else if (transaction.type === 'transfer_external_out') {
            let bank = 'StackOvercash Bank';
            if (transaction.external_bank_code === 'Blinders')
                bank = 'Techy Blinders Bank';
            else if (transaction.external_bank_code === 'Dragon')
                bank = 'Dragon Fly Bank';
            description = `Sent money to ${
                transaction.external_account_number ||
                transaction.receiver_account_number
            } (${bank})`;
        } else if (transaction.type === 'transfer_external_in') {
            description = `Received money from ${
                transaction.external_account_number ||
                transaction.sender_account_number
            }`;
        } else if (transaction.type === 'deposit') {
            description = `Deposit`;
        } else if (transaction.type === 'withdrawal') {
            description = `Withdraw`;
        }
        const userAccount = transaction.account_number || TEXT.NA;
        row.innerHTML = `
            <td data-label="Date">${transaction.date || TEXT.NA}</td>
            <td data-label="Account Number">${userAccount}</td>
            <td data-label="Amount" class="${amountClass}">${
            CURRENCY.SYMBOL
        } ${amount.toLocaleString(CURRENCY.LOCALE, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}</td>
            <td data-label="Description">${description}</td>
            <td data-label="Reference Number">${
                transaction.transaction_id || TEXT.NA
            }</td>
        `;
        transaction_table_body.appendChild(row);
    });
}

function updatePaginationInfo() {
    if (!showing_info_span) return;

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, totalTransactions);

    if (totalTransactions === 0) {
        showing_info_span.textContent = TEXT.SHOWING_ZERO;
    } else {
        showing_info_span.textContent = `Showing ${start} to ${end} of ${totalTransactions}`;
    }
}

// Update state of pagination buttons (Previous/Next)
function updatePaginationButtons() {
    if (previous_page_button) {
        previous_page_button.disabled = currentPage === 1;
    }
    if (next_page_button) {
        next_page_button.disabled =
            currentPage === totalPages || totalPages === 0;
    }
}

// Render clickable page numbers
function renderPageNumbers() {
    if (!page_numbers_container) return;

    page_numbers_container.innerHTML = '';

    // Display a limited number of page links around the current page
    const maxPageLinks = 5; // Max number of page links to show
    let startPage = Math.max(1, currentPage - Math.floor(maxPageLinks / 2));
    let endPage = Math.min(totalPages, startPage + maxPageLinks - 1);

    // Adjust startPage if endPage is capped
    if (endPage - startPage + 1 < maxPageLinks && totalPages >= maxPageLinks) {
        startPage = Math.max(1, endPage - maxPageLinks + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageLink = document.createElement('span');
        pageLink.classList.add(CLASS.PAGE_NUMBER);
        if (i === currentPage) {
            pageLink.classList.add(CLASS.ACTIVE);
        }
        pageLink.textContent = i;
        pageLink.dataset.page = i;
        pageLink.addEventListener('click', handlePageClick);
    }
}

// Handle click on a page number
function handlePageClick(event) {
    const page = parseInt(event.target.dataset.page, 10);
    if (
        !isNaN(page) &&
        page >= 1 &&
        page <= totalPages &&
        page !== currentPage
    ) {
        currentPage = page;
        fetchTransactions();
    }
}

// Event listeners for pagination buttons
if (previous_page_button) {
    previous_page_button.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchTransactions();
        }
    });
}

if (next_page_button) {
    next_page_button.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchTransactions();
        }
    });
}

// Event listener for items per page select
if (items_per_page_select) {
    items_per_page_select.addEventListener('change', () => {
        itemsPerPage = parseInt(items_per_page_select.value, 10);
        currentPage = 1;
        fetchTransactions();
    });
}

if (go_button) {
    const page_number_input = document.getElementById('page_number_input');

    if (page_number_input) {
        go_button.addEventListener('click', () => {
            const pageToGo = parseInt(page_number_input.value, 10);
            if (!isNaN(pageToGo) && pageToGo >= 1 && pageToGo <= totalPages) {
                currentPage = pageToGo;
                fetchTransactions();
            } else {
                showNotification(
                    `Invalid page number. Please enter a number between 1 and ${totalPages}.`,
                    CLASS.ERROR
                );
            }
        });
    } else {
        go_button.classList.add(CLASS.HIDDEN);
    }
}
// Function to display user initial in avatar container
function display_user_initial() {
    if (!user_avatar_container) return;

    const userName =
        user_data.first_name && user_data.last_name
            ? `${user_data.first_name} ${user_data.last_name}`.trim()
            : user_name_element
            ? user_name_element.textContent.trim()
            : 'User';

    const initial = userName.charAt(0).toUpperCase();
    user_avatar_container.textContent = initial;
}

// Removed setup_profile_edit and populate_profile_form functions as modal was removed from HTML

// Initial fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchUserData(); // Fetch user data on load
    fetchTransactions(); // Existing fetch for transactions
    console.log('StackOvercash Transaction Page Initialized Dynamically!');

    // --- MOBILE/TABLET TOPNAV DROPDOWN LOGIC (copied from dashboard) ---
    const hamburgerBtn = document.getElementById('hamburger_btn');
    const topnavDropdown = document.getElementById('topnav_dropdown');

    if (hamburgerBtn && topnavDropdown) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 1024) {
                topnavDropdown.classList.toggle('open');
            }
        });
        // Close dropdown when clicking a nav link or logout
        topnavDropdown
            .querySelectorAll('.nav-link, .logout-btn')
            .forEach((el) => {
                el.addEventListener('click', () => {
                    topnavDropdown.classList.remove('open');
                });
            });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (
                topnavDropdown.classList.contains('open') &&
                !topnavDropdown.contains(e.target) &&
                e.target !== hamburgerBtn
            ) {
                topnavDropdown.classList.remove('open');
            }
        });
    }
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', (event) => {
            event.preventDefault();
            handleLogout();
        });
    }
});

// Function to handle logout
async function handleLogout() {
    try {
        // Clear relevant items from localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('account');
        localStorage.removeItem('token');

        // Call backend logout API
        await fetch(API_ENDPOINTS.LOGOUT || API_ENDPOINTS.AUTH.LOGOUT, {
            method: 'POST',
            credentials: 'same-origin',
        });

        // Redirect to login page after successful logout
        window.location.href = '/login';
    } catch (error) {
        console.error('Error during logout:', error);
        showNotification(
            'Logout might not have been fully successful.',
            CLASS.WARNING
        );
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
    }
}

// Event listener for logout button
const logout_btn = document.getElementById('logout_btn');
if (logout_btn) {
    logout_btn.addEventListener('click', (event) => {
        event.preventDefault();
        handleLogout();
    });
}

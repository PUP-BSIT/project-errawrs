import { API_ENDPOINTS } from '/api_config.js';

let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;

// DOM Elements
let transactionContent;
let searchInput;
let searchBtn;
let paginationContainer;

let allTransactions = [];
let filteredTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
    transactionContent = document.querySelector('.transactions-content');
    searchInput = document.querySelector('.search-input');
    searchBtn = document.querySelector('.search-btn');
    paginationContainer = document.querySelector('.transaction-pagination');

    fetchAllTransactions();

    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

    // Logout logic
    const logoutBtn = document.getElementById('logout_btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch(API_ENDPOINTS.USER_LOGOUT, { method: 'POST', credentials: 'include' });
            } catch (err) {}
            sessionStorage.clear();
            window.location.href = '/login';
        });
    }

    // Session check on page load
    (async function() {
        try {
            const res = await fetch(API_ENDPOINTS.ADMIN_SESSION_CHECK, { credentials: 'include' });
            const data = await res.json();
            if (!data.success) {
                window.location.href = '/login';
            }
        } catch (e) {
            window.location.href = '/login';
        }
    })();
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        window.location.reload();
    }
});

async function fetchAllTransactions() {
    try {
        if (searchInput) searchInput.classList.add('loading');
        const url = `${API_ENDPOINTS.ADMIN_GET_TRANSACTIONS}?page=1&limit=1000`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to load transactions');
        allTransactions = data.transactions;
        filteredTransactions = [...allTransactions];
        currentPage = 1;
        displayTransactionsPaginated();
        updatePagination();
    } catch (error) {
        showError('Failed to load transactions. Please try again later.');
    } finally {
        if (searchInput) searchInput.classList.remove('loading');
    }
}

function handleSearchInput(e) {
    const searchTerm = e.target.value.trim().toLowerCase();
    filteredTransactions = allTransactions.filter(trx =>
        (trx.transaction_id && trx.transaction_id.toString().includes(searchTerm)) ||
        (trx.sender_account_number && trx.sender_account_number.toLowerCase().includes(searchTerm)) ||
        (trx.receiver_account_number && trx.receiver_account_number.toLowerCase().includes(searchTerm)) ||
        (trx.teller_full_name && trx.teller_full_name.toLowerCase().includes(searchTerm))
    );
    currentPage = 1;
    displayTransactionsPaginated();
    updatePagination();
}

function displayTransactionsPaginated() {
    let transactionList = document.querySelector('.transaction-list');
    if (!transactionList) {
        transactionList = document.createElement('div');
        transactionList.className = 'transaction-list';
        transactionContent.insertBefore(transactionList, document.querySelector('.transaction-pagination'));
    }
    transactionList.innerHTML = '';
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageTransactions = filteredTransactions.slice(startIndex, endIndex);
    if (pageTransactions.length === 0) {
        transactionList.innerHTML = `
            <div class="no-transactions">
                <p>No transactions found</p>
            </div>
        `;
        return;
    }
    pageTransactions.forEach(transaction => {
        const transactionEl = document.createElement('div');
        transactionEl.className = 'transaction-item';
        const transactionType = formatTransactionType(transaction.transaction_type);
        const amount = formatAmount(transaction.amount);
        const date = formatDate(transaction.transaction_date);
        let senderDisplay = transaction.sender_account_number || 'N/A';
        let receiverDisplay = transaction.receiver_account_number || 'N/A';
        if (transaction.transaction_type === 'deposit' && transaction.teller_full_name) {
            senderDisplay = transaction.teller_full_name;
        } else if (transaction.transaction_type === 'withdrawal' && transaction.teller_full_name) {
            senderDisplay = transaction.teller_full_name;
        } else if (transaction.teller_full_name && !transaction.sender_account_number) {
            senderDisplay = transaction.teller_full_name;
        }
        if (transaction.external_bank_code && transaction.external_account_number) {
            if (transaction.transaction_type === 'transfer_external_in') {
                senderDisplay = `${transaction.external_bank_code} - ${transaction.external_account_number}`;
            } else if (transaction.transaction_type === 'transfer_external_out') {
                receiverDisplay = `${transaction.external_bank_code} - ${transaction.external_account_number}`;
            }
        }
        transactionEl.innerHTML = `
            <div class="transaction-icon">
                <i class="fas ${getTransactionIcon(transaction.transaction_type)}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-main">
                    <h3 class="transaction-title">${transactionType}</h3>
                    <span class="transaction-amount">${amount}</span>
                </div>
                <div class="transaction-meta">
                    <span class="transaction-id">ID: ${transaction.transaction_id}</span>
                    <span class="transaction-date">${date}</span>
                </div>
                <div class="transaction-users">
                    <div class="transaction-users-list">
                        <span>From: ${senderDisplay}</span>
                        <span>To: ${receiverDisplay}</span>
                    </div>
                    <div class="transaction-completed">
                        Completed
                    </div>
                </div>
            </div>
        `;
        transactionList.appendChild(transactionEl);
    });
}

function updatePagination() {
    totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
    paginationContainer.innerHTML = '';
    // Previous button
    const prevBtn = createPaginationButton('prev', '<i class="fas fa-chevron-left"></i>', currentPage > 1);
    paginationContainer.appendChild(prevBtn);
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            const pageBtn = createPaginationButton('page', i, true, i === currentPage);
            paginationContainer.appendChild(pageBtn);
        } else if (
            (i === currentPage - 2 && currentPage > 3) ||
            (i === currentPage + 2 && currentPage < totalPages - 2)
        ) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
    }
    // Next button
    const nextBtn = createPaginationButton('next', '<i class="fas fa-chevron-right"></i>', currentPage < totalPages);
    paginationContainer.appendChild(nextBtn);
}

function createPaginationButton(type, content, enabled, isActive = false) {
    const button = document.createElement('button');
    button.className = `pagination-btn${isActive ? ' active' : ''}`;
    button.innerHTML = content;
    if (!enabled) {
        button.disabled = true;
    } else {
        button.addEventListener('click', () => {
            if (type === 'prev' && currentPage > 1) {
                currentPage--;
            } else if (type === 'next' && currentPage < totalPages) {
                currentPage++;
            } else if (type === 'page') {
                currentPage = parseInt(content);
            }
            displayTransactionsPaginated();
            updatePagination(); // <-- Ensure pagination controls update after page change
        });
    }
    return button;
}

function getTransactionIcon(type) {
    const iconMap = {
        'deposit': 'fa-arrow-down',
        'withdrawal': 'fa-arrow-up',
        'transfer': 'fa-exchange-alt'
    };
    return iconMap[type.toLowerCase()] || 'fa-circle';
}

function formatTransactionType(type) {
    return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function formatAmount(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="${getToastIcon(type)}"></i>
        <span>${message}</span>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(toast);
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
    }
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getToastIcon(type) {
    switch (type) {
        case 'success':
            return 'fas fa-check-circle';
        case 'error':
            return 'fas fa-exclamation-circle';
        case 'warning':
            return 'fas fa-exclamation-triangle';
        default:
            return 'fas fa-info-circle';
    }
}

function showError(message, debugInfo = null) {
    let fullMessage = `${message}`;
    if (debugInfo) {
        fullMessage += `<br><span class='error-debug-info'>${debugInfo}</span>`;
    }
    showToast(fullMessage, 'error');
}
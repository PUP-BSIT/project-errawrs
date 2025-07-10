// Admin session check
const adminInfo = JSON.parse(localStorage.getItem('admin'));
if (!adminInfo || !adminInfo.username) {
    window.location.href = '/project-errawrs/public/admin/login.html';
}

// Global fetch wrapper to handle 401 Unauthorized
async function fetchWithAuth(url, options) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        localStorage.removeItem('admin');
        window.location.href = '/project-errawrs/public/admin/login.html';
        return null;
    }
    return response;
}

// State management for transactions
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;

// DOM Elements
const transactionContent = document.querySelector('.transactions-content');
const searchInput = document.querySelector('.search-input');
const searchBtn = document.querySelector('.search-btn');
const paginationContainer = document.querySelector('.transaction-pagination');

// Event Listeners
async function handleLogout(e) {
    e.preventDefault();
    try {
        await fetchWithAuth('/project-errawrs/src/api/auth/logout.php', { method: 'POST', credentials: 'include' });
    } catch (err) { /* ignore */ }
    sessionStorage.clear();
    localStorage.removeItem('admin');
    window.location.href = '/project-errawrs/public/admin/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
    
    searchBtn.addEventListener('click', () => {
        currentPage = 1;
        loadTransactions();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            loadTransactions();
        }
    });

    const logoutBtn = document.getElementById('logout_btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// Load transactions from the API
async function loadTransactions() {
    try {
        const searchQuery = searchInput.value ? searchInput.value.trim() : '';
        const statusFilter = '';
        const url = `/project-errawrs/src/api/admin/get_transactions.php?page=${currentPage}&limit=${itemsPerPage}&search_query=${encodeURIComponent(searchQuery)}&status=${statusFilter}`;
        console.log('Fetching transactions from:', url);
        const response = await fetchWithAuth(url, {
            credentials: 'include'
        });

        if (response === null) return;

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load transactions');
        }

        totalPages = data.total_pages;
        displayTransactions(data.transactions);
        updatePagination();

    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Failed to load transactions. Please try again later.');
    }
}

// Display transactions in the UI
function displayTransactions(transactions) {
    // Create transaction list container if it doesn't exist
    let transactionList = document.querySelector('.transaction-list');
    if (!transactionList) {
        transactionList = document.createElement('div');
        transactionList.className = 'transaction-list';
        transactionContent.insertBefore(transactionList, document.querySelector('.transaction-pagination'));
    }

    // Clear existing transactions
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <div class="no-transactions">
                <p>No transactions found</p>
            </div>
        `;
        return;
    }

    // Add each transaction
    transactions.forEach(transaction => {
        const transactionEl = document.createElement('div');
        transactionEl.className = 'transaction-item';
        
        const transactionType = formatTransactionType(transaction.transaction_type);
        const amount = formatAmount(transaction.amount);
        const date = formatDate(transaction.transaction_date);

        // Handle sender and receiver display based on transaction type
        let senderDisplay = transaction.sender_username || 'N/A';
        let receiverDisplay = transaction.receiver_username || 'N/A';

        // If teller_full_name is present, show it as the sender (for teller-initiated transactions)
        if (transaction.teller_full_name) {
            senderDisplay = transaction.teller_full_name;
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
                    <div>
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

// Update pagination controls
function updatePagination() {
    paginationContainer.innerHTML = '';
    
    // Previous button
    const prevBtn = createPaginationButton('prev', '<i class="fas fa-chevron-left"></i>', currentPage > 1);
    paginationContainer.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || // First page
            i === totalPages || // Last page
            (i >= currentPage - 1 && i <= currentPage + 1) // Pages around current page
        ) {
            const pageBtn = createPaginationButton('page', i, true, i === currentPage);
            paginationContainer.appendChild(pageBtn);
        } else if (
            (i === currentPage - 2 && currentPage > 3) ||
            (i === currentPage + 2 && currentPage < totalPages - 2)
        ) {
            // Add dots for skipped pages
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

// Create pagination button helper
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
            loadTransactions();
        });
    }
    
    return button;
}

// Utility functions
function getTransactionIcon(type) {
    const iconMap = {
        'deposit': 'fa-arrow-down',
        'withdrawal': 'fa-arrow-up',
        'transfer': 'fa-exchange-alt'
    };
    return iconMap[type.toLowerCase()] || 'fa-circle';
}

function formatTransactionType(type) {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
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

// Toast notification helpers (copied and adapted from manage_tellers.js)
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

    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
    }

    // Auto remove after 5 seconds
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

// Replace showError to use toast
function showError(message, debugInfo = null) {
    let fullMessage = `${message}`;
    if (debugInfo) {
        fullMessage += `<br><span style='font-size:0.95em;color:#a94442;'>${debugInfo}</span>`;
    }
    showToast(fullMessage, 'error');
}
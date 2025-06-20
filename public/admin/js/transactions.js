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
});

// Load transactions from the API
async function loadTransactions() {
    try {
        const searchQuery = searchInput.value ? searchInput.value.trim() : '';
        const statusFilter = '';
        const url = `/project-errawrs/src/api/admin/get_transactions.php?page=${currentPage}&limit=${itemsPerPage}&search_query=${encodeURIComponent(searchQuery)}&status=${statusFilter}`;
        console.log('Fetching transactions from:', url);
        const response = await fetch(url, {
            credentials: 'include'
        });

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

        // If teller_number is present, show it as the sender (for teller-initiated transactions)
        if (transaction.teller_number) {
            senderDisplay = transaction.teller_number;
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
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
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

function showError(message, debugInfo = null) {
    // Remove existing error message
    const existingErrorDiv = document.querySelector('.error-message');
    if (existingErrorDiv) {
        existingErrorDiv.remove();
    }

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <p>${message}</p>
        ${debugInfo ? `<pre style="white-space: pre-wrap; word-break: break-all; font-size: 0.8em; color: #a94442;">${debugInfo}</pre>` : ''}
    `;
    
    // Insert at the top of the transactions content
    transactionContent.insertBefore(errorDiv, transactionContent.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}
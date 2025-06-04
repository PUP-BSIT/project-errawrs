// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo'));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error('No teller info found in session storage');
    window.location.href = './bank_teller_login.html';
}

// Initialize search history
let searchHistory = [];

// Elements
const searchInput = document.getElementById('search_input');
const accountDetails = document.getElementById('account_details');
const accountActionsDropdown = document.getElementById('accountActionsDropdown');
const dropdownIcon = document.getElementById('dropdownIcon');
const historyBody = document.getElementById('history_body');

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

// Show notification
function showNotification(message, isError = false) {
    const container = document.getElementById('notification_container');
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    container.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Update account details in the UI
function updateAccountDetails(account) {
    document.getElementById('account_number').textContent = account.account_number;
    document.getElementById('account_name').textContent = account.user.name;
    document.getElementById('account_type').textContent = 'Savings';
    
    // Format the balance properly
    const balance = parseFloat(account.balance.replace(/[^0-9.-]+/g, ''));
    document.getElementById('account_balance').textContent = formatCurrency(balance);
    
    const statusElement = document.getElementById('account_status');
    statusElement.className = account.status === 'active' ? 'status-active' : 'status-inactive';
    statusElement.innerHTML = `<div class="status-icon">${account.status === 'active' ? '✓' : '✕'}</div>${account.status}`;

    // Store current account in session storage
    sessionStorage.setItem('currentAccount', JSON.stringify({
        ...account,
        balance: balance // Store the parsed balance
    }));

    // Show the account details section
    accountDetails.style.display = 'flex';
}

// Add to search history
function addToSearchHistory(account) {
    // Check if the account already exists in search history
    const existingIndex = searchHistory.findIndex(item => item.accountNumber === account.account_number);
    
    if (existingIndex !== -1) {
        // Remove the existing entry
        searchHistory.splice(existingIndex, 1);
    }
    
    // Add to the beginning of the array
    searchHistory.unshift({
        name: account.user.name,
        accountNumber: account.account_number
    });

    // Keep only the last 5 searches
    searchHistory = searchHistory.slice(0, 5);

    // Update history UI
    updateSearchHistory();
}

// Update search history UI
function updateSearchHistory() {
    historyBody.innerHTML = '';
    searchHistory.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'history-row';
        row.onclick = () => selectFromHistory(item.name, item.accountNumber);
        row.innerHTML = `
            <div class="history-value">${index + 1}</div>
            <div class="history-value">${item.name}</div>
            <div class="history-value">${item.accountNumber}</div>
        `;
        historyBody.appendChild(row);
    });
}

// Add event listener for search input
searchInput.addEventListener('input', debounce(searchAccount, 500));

// Debounce function to prevent too many API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search account
async function searchAccount() {
    const searchTerm = searchInput.value.trim();
    console.log('Searching for:', searchTerm); // Debug log

    if (!searchTerm) {
        accountDetails.style.display = 'none';
        return;
    }

    if (!tellerInfo || !tellerInfo.teller_number) {
        console.error('No teller number found');
        showNotification('Please log in again', true);
        window.location.href = './bank_teller_login.html';
        return;
    }

    try {
        console.log('Making API request...'); // Debug log
        const response = await fetch(`/project-errawrs/src/api/teller/search_account.php?search=${encodeURIComponent(searchTerm)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`);
        console.log('Response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('API response:', data); // Debug log

        if (!response.ok) {
            throw new Error(data.error || 'Failed to search account');
        }

        if (data.success && data.accounts && data.accounts.length > 0) {
            const account = data.accounts[0]; // Get the first account
            updateAccountDetails(account);
            addToSearchHistory(account);
        } else {
            accountDetails.style.display = 'none';
            showNotification('No accounts found', true);
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification(error.message || 'Error searching for account', true);
        accountDetails.style.display = 'none';
    }
}

// Select from history
function selectFromHistory(name, accountNumber) {
    searchInput.value = accountNumber;
    searchAccount();
}

// Toggle account actions dropdown
function toggleAccountActions() {
    accountActionsDropdown.style.display = accountActionsDropdown.style.display === 'none' ? 'flex' : 'none';
    dropdownIcon.classList.toggle('fa-chevron-up');
    dropdownIcon.classList.toggle('fa-chevron-down');
}

// Show transaction form
function showTransactionForm() {
    const transactionForm = document.getElementById('transaction_form');
    transactionForm.classList.add('visible', 'show');
    document.getElementById('transaction_amount').focus();
}

// Hide transaction form
function hideTransactionForm() {
    const transactionForm = document.getElementById('transaction_form');
    transactionForm.classList.remove('show');
    setTimeout(() => {
        transactionForm.classList.remove('visible');
        document.getElementById('transaction_amount').value = ''; // Clear input
    }, 300);
}

// Show deposit form
function showDepositForm() {
    const transactionForm = document.getElementById('transaction_form');
    const container = transactionForm.querySelector('.transaction-container');
    const account = JSON.parse(sessionStorage.getItem('currentAccount'));
    
    container.innerHTML = `
        <div class="transaction-header">
            <h2>Deposit</h2>
            <p>Current Balance: ${formatCurrency(account.balance)}</p>
        </div>
        <div class="transaction-form-content">
            <div class="form-group">
                <label for="transaction_amount">Enter Amount</label>
                <input type="number" id="transaction_amount" placeholder="₱0.00" step="0.01" min="0">
            </div>
            <div class="form-actions">
                <button class="form-btn cancel-btn" onclick="hideTransactionForm()">Cancel</button>
                <button class="form-btn confirm-btn" onclick="processTransaction('deposit')">Confirm</button>
            </div>
        </div>
    `;

    showTransactionForm();
}

// Show withdraw form
function showWithdrawForm() {
    const transactionForm = document.getElementById('transaction_form');
    const container = transactionForm.querySelector('.transaction-container');
    const account = JSON.parse(sessionStorage.getItem('currentAccount'));
    
    container.innerHTML = `
        <div class="transaction-header">
            <h2>Withdraw</h2>
            <p>Current Balance: ${formatCurrency(account.balance)}</p>
        </div>
        <div class="transaction-form-content">
            <div class="form-group">
                <label for="transaction_amount">Enter Amount</label>
                <input type="number" id="transaction_amount" placeholder="₱0.00" step="0.01" min="0" max="${account.balance}">
            </div>
            <div class="form-actions">
                <button class="form-btn cancel-btn" onclick="hideTransactionForm()">Cancel</button>
                <button class="form-btn confirm-btn" onclick="processTransaction('withdraw')">Confirm</button>
            </div>
        </div>
    `;

    showTransactionForm();
}

// Process transaction (deposit/withdraw)
async function processTransaction(type) {
    const amount = parseFloat(document.getElementById('transaction_amount').value);
    const account = JSON.parse(sessionStorage.getItem('currentAccount'));

    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount', true);
        return;
    }

    if (type === 'withdraw' && amount > account.balance) {
        showNotification('Insufficient balance', true);
        return;
    }

    try {
        const response = await fetch(`/project-errawrs/src/api/teller/${type}.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account_number: account.account_number,
                amount: amount,
                teller_number: tellerInfo.teller_number
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to ${type}`);
        }

        // Update the UI with new balance
        account.balance = data.new_balance;
        sessionStorage.setItem('currentAccount', JSON.stringify(account));
        updateAccountDetails(account);
        
        hideTransactionForm();
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} successful`, false);

    } catch (error) {
        console.error(`${type} error:`, error);
        showNotification(error.message, true);
    }
}

// Close account
async function closeAccount() {
    const account = JSON.parse(sessionStorage.getItem('currentAccount'));
    
    try {
        const response = await fetch(`/project-errawrs/src/api/teller/update_account_status.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account_number: account.account_number,
                status: 'inactive',
                teller_number: tellerInfo.teller_number
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to close account');
        }

        account.status = 'inactive';
        sessionStorage.setItem('currentAccount', JSON.stringify(account));
        updateAccountDetails(account);
        showNotification('Account closed successfully', false);

    } catch (error) {
        console.error('Close account error:', error);
        showNotification(error.message, true);
    }
}

// Reopen account
async function reopenAccount() {
    const account = JSON.parse(sessionStorage.getItem('currentAccount'));
    
    try {
        const response = await fetch(`/project-errawrs/src/api/teller/update_account_status.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account_number: account.account_number,
                status: 'active',
                teller_number: tellerInfo.teller_number
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to reopen account');
        }

        account.status = 'active';
        sessionStorage.setItem('currentAccount', JSON.stringify(account));
        updateAccountDetails(account);
        showNotification('Account reopened successfully', false);

    } catch (error) {
        console.error('Reopen account error:', error);
        showNotification(error.message, true);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Hide account details initially
    accountDetails.style.display = 'none';
    accountActionsDropdown.style.display = 'none';

    // Add search input event listener
    searchInput.addEventListener('input', debounce(searchAccount, 500));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchAccount();
        }
    });

    // Update user profile if available
    if (tellerInfo) {
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = tellerInfo.name;
        }
    }

    // Check for account number in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const accountParam = urlParams.get('account');
    if (accountParam) {
        searchInput.value = accountParam;
        searchAccount();
    }
});
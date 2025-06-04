// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo'));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error('No teller info found in session storage');
    window.location.href = './bank_teller_login.html';
}

// Elements
const searchInput = document.getElementById('search_input');
const accountCard = document.getElementById('account_card');
const accountActionsDropdown = document.getElementById('account_actions_dropdown');
const searchHistoryContainer = document.getElementById('search_history');
const historyBody = document.getElementById('history_body');

// Initialize search history from localStorage
let searchHistory = JSON.parse(localStorage.getItem(`searchHistory_${tellerInfo.teller_number}`)) || [];

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
    document.getElementById('account_type').textContent = 'Checking';
    
    // Format the balance properly with peso sign
    const balance = parseFloat(account.balance.replace(/[^0-9.-]+/g, ''));
    document.getElementById('account_balance').textContent = formatCurrency(balance);
    
    // Update status with proper styling
    const statusElement = document.getElementById('account_status');
    if (account.status === 'active') {
        statusElement.textContent = 'Active';
        statusElement.className = 'account-value active';
    } else {
        statusElement.textContent = 'Inactive';
        statusElement.className = 'account-value';
    }

    // Store current account in session storage
    sessionStorage.setItem('currentAccount', JSON.stringify({
        ...account,
        balance: balance
    }));

    // Show the account card
    accountCard.style.display = 'block';
}

// Toggle account actions
function toggleAccountActions() {
    const accountCard = document.getElementById('account_card');
    const accountActions = document.getElementById('account_actions');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    accountCard.classList.toggle('expanded');
    accountActions.classList.toggle('visible');
    toggleIcon.classList.toggle('active');
}

// Handle action button clicks
function showDepositForm() {
    window.location.href = './bank_teller_deposit.html';
}

function showWithdrawForm() {
    window.location.href = './bank_teller_withdraw.html';
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
        accountNumber: account.account_number,
        balance: account.balance,
        status: account.status
    });

    // Keep only the last 5 searches
    searchHistory = searchHistory.slice(0, 5);

    // Save to localStorage with teller-specific key
    localStorage.setItem(`searchHistory_${tellerInfo.teller_number}`, JSON.stringify(searchHistory));

    // Update history UI
    updateSearchHistory();
}

// Update search history UI
function updateSearchHistory() {
    historyBody.innerHTML = '';
    searchHistory.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'history-row';
        row.onclick = () => selectFromHistory(item.accountNumber);
        
        const balance = parseFloat(item.balance.toString().replace(/[^0-9.-]+/g, ''));
        
        row.innerHTML = `
            <div class="history-value">${index + 1}</div>
            <div class="history-value">${item.name}</div>
            <div class="history-value">${item.accountNumber}</div>
            <div class="history-value">${formatCurrency(balance)}</div>
            <div class="history-value status ${item.status === 'active' ? '' : 'inactive'}">${
                item.status.charAt(0).toUpperCase() + item.status.slice(1)
            }</div>
        `;
        historyBody.appendChild(row);
    });

    // Show/hide search history container based on history existence
    searchHistoryContainer.style.display = searchHistory.length > 0 ? 'block' : 'none';
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

    // Hide account card when search is empty
    if (!searchTerm) {
        accountCard.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/project-errawrs/src/api/teller/search_account.php?search=${encodeURIComponent(searchTerm)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to search account');
        }

        if (data.success && data.accounts && data.accounts.length > 0) {
            const account = data.accounts[0];
            updateAccountDetails(account);
            addToSearchHistory(account);
        } else {
            accountCard.style.display = 'none';
            showNotification('No accounts found', true);
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification(error.message || 'Error searching for account', true);
        accountCard.style.display = 'none';
    }
}

// Select from history
function selectFromHistory(accountNumber) {
    searchInput.value = accountNumber;
    searchAccount();
}

// Show transaction form
function showTransactionForm(type) {
    const transactionModal = document.getElementById('transaction_form');
    const container = transactionModal.querySelector('.transaction-container');
    const account = JSON.parse(sessionStorage.getItem('currentAccount'));
    
    container.innerHTML = `
        <div class="transaction-header">
            <h2>${type.charAt(0).toUpperCase() + type.slice(1)}</h2>
            <p>Current Balance: ${formatCurrency(account.balance)}</p>
        </div>
        <div class="form-group">
            <label for="transaction_amount">Amount</label>
            <input type="number" 
                   id="transaction_amount" 
                   placeholder="Enter amount" 
                   step="0.01" 
                   min="0"
                   ${type === 'withdraw' ? `max="${account.balance}"` : ''}>
        </div>
        <div class="form-actions">
            <button class="form-btn cancel-btn" onclick="hideTransactionForm()">Cancel</button>
            <button class="form-btn confirm-btn" onclick="processTransaction('${type}')">Confirm</button>
        </div>
    `;

    transactionModal.style.display = 'flex';
    document.getElementById('transaction_amount').focus();
}

// Hide transaction form
function hideTransactionForm() {
    const transactionModal = document.getElementById('transaction_form');
    transactionModal.style.display = 'none';
}

// Process transaction
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

        account.balance = data.new_balance;
        sessionStorage.setItem('currentAccount', JSON.stringify(account));
        updateAccountDetails(account);
        
        hideTransactionForm();
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} successful`);

    } catch (error) {
        console.error(`${type} error:`, error);
        showNotification(error.message, true);
    }
}

// Close account
async function closeAccount() {
    const accountActions = document.getElementById('account_actions');
    accountActions.classList.remove('visible');
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
        toggleAccountActions();
        showNotification('Account closed successfully');

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
        toggleAccountActions();
        showNotification('Account reopened successfully');

    } catch (error) {
        console.error('Reopen account error:', error);
        showNotification(error.message, true);
    }
}

// Function to update account balance and refresh account card
async function updateAccountBalance(newBalance) {
    try {
        // Get the current account number
        const currentAccount = JSON.parse(sessionStorage.getItem('currentAccount'));
        if (!currentAccount || !currentAccount.account_number) return;

        // Fetch fresh account data
        const response = await fetch(`/project-errawrs/src/api/teller/search_account.php?search=${encodeURIComponent(currentAccount.account_number)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to refresh account data');
        }

        if (data.success && data.accounts && data.accounts.length > 0) {
            const account = data.accounts[0];
            updateAccountDetails(account);
            
            // Update search history with new balance
            const historyIndex = searchHistory.findIndex(item => item.accountNumber === account.account_number);
            if (historyIndex !== -1) {
                searchHistory[historyIndex].balance = account.balance;
                localStorage.setItem(`searchHistory_${tellerInfo.teller_number}`, JSON.stringify(searchHistory));
                updateSearchHistory();
            }
        }
    } catch (error) {
        console.error('Error updating account data:', error);
        showNotification('Error refreshing account data', true);
    }
}

// Event listener for storage changes
window.addEventListener('storage', (e) => {
    if (e.key === 'currentAccount') {
        const account = JSON.parse(e.newValue);
        if (account) {
            updateAccountBalance(account.balance);
        }
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Hide account card initially
    accountCard.style.display = 'none';
    
    // Update search history display
    updateSearchHistory();

    // Add search input event listeners
    searchInput.addEventListener('keyup', (e) => {
        // Hide account card if search input is empty
        if (!searchInput.value.trim()) {
            accountCard.style.display = 'none';
            return;
        }
        
        // Perform search on Enter key
        if (e.key === 'Enter') {
            searchAccount();
        }
    });

    // Add input event listener to handle clearing via backspace/delete
    searchInput.addEventListener('input', (e) => {
        if (!e.target.value.trim()) {
            accountCard.style.display = 'none';
        }
    });

    // Update user profile if available
    if (tellerInfo) {
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = tellerInfo.name;
        }
    }

    // Close account actions when clicking outside
    document.addEventListener('click', (e) => {
        const accountCard = document.getElementById('account_card');
        const accountActions = document.getElementById('account_actions');
        const toggleIcon = document.querySelector('.toggle-icon');
        
        if (!accountCard.contains(e.target) && !accountActions.contains(e.target)) {
            accountCard.classList.remove('expanded');
            accountActions.classList.remove('visible');
            toggleIcon.classList.remove('active');
        }
    });
});
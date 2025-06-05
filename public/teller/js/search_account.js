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
function updateAccountDetails(accounts) {
    // Clear any existing account cards
    const accountContainer = document.querySelector('.account-container');
    accountContainer.innerHTML = '';

    accounts.forEach(account => {
        // Create a new card wrapper
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'card-wrapper';
        
        const newCard = document.createElement('div');
        newCard.className = 'account-card visible';
        
        // Format the balance properly with peso sign
        const balance = parseFloat(account.balance.replace(/[^0-9.-]+/g, ''));
        
        newCard.innerHTML = `
            <div class="account-info">
                <div class="account-label">Account Number</div>
                <div class="account-value">${account.account_number}</div>
                
                <div class="account-label">Account Holder Name</div>
                <div class="account-value">${account.user.name}</div>
                
                <div class="account-label">Account Type</div>
                <div class="account-value">Checking</div>
                
                <div class="account-label">Current Balance</div>
                <div class="account-value">${formatCurrency(balance)}</div>
                
                <div class="account-label">Account Status</div>
                <div class="account-value ${account.status === 'active' ? 'active' : 'closed'}">
                    ${account.status === 'active' ? 'Active' : 'Closed'}
                </div>
            </div>
            <div class="toggle-icon">
                <i class="fas fa-chevron-right"></i>
            </div>
        `;

        // Create actions container for this card
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'account-actions';
        actionsContainer.innerHTML = account.status === 'active' ? `
            <button class="action-btn deposit">
                <i class="fas fa-plus"></i> Deposit
            </button>
            <button class="action-btn withdraw">
                <i class="fas fa-minus"></i> Withdraw
            </button>
            <button class="action-btn close">
                <i class="fas fa-times"></i> Close Account
            </button>
        ` : `
            <button class="action-btn reopen">
                <i class="fas fa-redo"></i> Reopen Account
            </button>
        `;

        // Add event listeners to buttons
        const buttons = actionsContainer.getElementsByTagName('button');
        Array.from(buttons).forEach(button => {
            if (button.classList.contains('deposit')) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem('currentAccount', JSON.stringify({...account, balance: balance}));
                    showDepositForm();
                };
            } else if (button.classList.contains('withdraw')) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem('currentAccount', JSON.stringify({...account, balance: balance}));
                    showWithdrawForm();
                };
            } else if (button.classList.contains('close')) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem('currentAccount', JSON.stringify({...account, balance: balance}));
                    closeAccount();
                };
            } else if (button.classList.contains('reopen')) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem('currentAccount', JSON.stringify({...account, balance: balance}));
                    reopenAccount();
                };
            }
        });

        // Add click event to toggle actions
        newCard.addEventListener('click', (e) => {
            e.stopPropagation();
            actionsContainer.classList.toggle('visible');
            const icon = newCard.querySelector('.toggle-icon i');
            icon.classList.toggle('fa-chevron-right');
            icon.classList.toggle('fa-chevron-left');

            // Match action container height to card height
            if (actionsContainer.classList.contains('visible')) {
                const cardHeight = newCard.offsetHeight;
                actionsContainer.style.height = `${cardHeight}px`;
            }
        });

        // Add card and actions to wrapper, then add wrapper to container
        cardWrapper.appendChild(newCard);
        cardWrapper.appendChild(actionsContainer);
        accountContainer.appendChild(cardWrapper);
    });

    // Add to search history if there's exactly one account
    if (accounts.length === 1) {
        addToSearchHistory(accounts[0]);
    }
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
        status: account.status,
        timestamp: new Date().toISOString() // Add timestamp for sorting
    });

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
            <div class="history-value status ${item.status === 'active' ? 'active' : 'closed'}">${
                item.status.charAt(0).toUpperCase() + item.status.slice(1)
            }</div>
        `;
        historyBody.appendChild(row);
    });

    // Show/hide search history container
    searchHistoryContainer.classList.toggle('visible', searchHistory.length > 0);
    searchHistoryContainer.classList.toggle('hidden', searchHistory.length === 0);
}

// Search account - now runs instantly without delay
async function searchAccount() {
    const searchTerm = searchInput.value.trim();

    // Always hide search history when there's a search term
    if (searchTerm) {
        searchHistoryContainer.classList.add('hidden');
    }

    // Clear account container and show search history when search is empty
    if (!searchTerm) {
        const accountContainer = document.querySelector('.account-container');
        accountContainer.innerHTML = '';
        searchHistoryContainer.classList.remove('hidden');
        hideLoadingIndicator();
        return;
    }

    // Show loading indicator immediately
    showLoadingIndicator();

    try {
        const response = await fetch(`/project-errawrs/src/api/teller/search_account.php?search=${encodeURIComponent(searchTerm)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`);
        const data = await response.json();

        // Hide loading indicator
        hideLoadingIndicator();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to search account');
        }

        if (data.success && data.accounts && data.accounts.length > 0) {
            // Filter accounts that start with the search term
            const matchingAccounts = data.accounts.filter(account => 
                account.account_number.toLowerCase().startsWith(searchTerm.toLowerCase())
            );
            
            if (matchingAccounts.length > 0) {
                updateAccountDetails(matchingAccounts);
            } else {
                const accountContainer = document.querySelector('.account-container');
                accountContainer.innerHTML = '';
                showNotification('No matching accounts found', true);
            }
        } else {
            const accountContainer = document.querySelector('.account-container');
            accountContainer.innerHTML = '';
            showNotification('No accounts found', true);
        }
    } catch (error) {
        console.error('Search error:', error);
        hideLoadingIndicator();
        showNotification(error.message || 'Error searching for account', true);
        const accountContainer = document.querySelector('.account-container');
        accountContainer.innerHTML = '';
    }
}

// Show loading indicator
function showLoadingIndicator() {
    // Create loading indicator if it doesn't exist
    let loadingIndicator = document.getElementById('loading_indicator');
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading_indicator';
        loadingIndicator.innerHTML = '<div class="spinner"></div><span>Searching...</span>';
        loadingIndicator.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            padding: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 1000;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        // Add spinner styles
        const style = document.createElement('style');
        style.textContent = `
            .spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Add to search input container
        const searchContainer = searchInput.parentElement;
        searchContainer.style.position = 'relative';
        searchContainer.appendChild(loadingIndicator);
    }
    
    loadingIndicator.style.display = 'flex';
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading_indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
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
        updateAccountDetails([account]);
        
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
        const response = await fetch(`/project-errawrs/src/api/teller/close_account.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account_number: account.account_number,
                teller_number: tellerInfo.teller_number
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to close account');
        }

        // Update account status in memory
        account.status = 'closed';
        sessionStorage.setItem('currentAccount', JSON.stringify(account));

        // Update UI immediately
        const statusElement = document.getElementById('account_status');
        statusElement.textContent = 'Closed';
        statusElement.className = 'account-value closed';

        // Update account actions immediately
        accountActions.innerHTML = `
            <button class="action-btn reopen">
                <i class="fas fa-redo"></i> Reopen Account
            </button>
        `;

        // Add event listeners to new buttons
        const buttons = accountActions.getElementsByTagName('button');
        Array.from(buttons).forEach(button => {
            if (button.classList.contains('reopen')) {
                button.onclick = reopenAccount;
            }
        });

        // Update search history with new status
        const historyIndex = searchHistory.findIndex(item => item.accountNumber === account.account_number);
        if (historyIndex !== -1) {
            searchHistory[historyIndex].status = 'closed';
            localStorage.setItem(`searchHistory_${tellerInfo.teller_number}`, JSON.stringify(searchHistory));
            
            // Update search history UI immediately
            const historyRows = document.querySelectorAll('.history-row');
            historyRows.forEach(row => {
                const accountNumberCell = row.children[2];
                if (accountNumberCell.textContent === account.account_number) {
                    const statusCell = row.children[4];
                    statusCell.textContent = 'Closed';
                    statusCell.className = 'history-value status closed';
                }
            });
        }

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
        const response = await fetch(`/project-errawrs/src/api/teller/reopen_account.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account_number: account.account_number,
                teller_number: tellerInfo.teller_number
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to reopen account');
        }

        // Update account status in memory
        account.status = 'active';
        sessionStorage.setItem('currentAccount', JSON.stringify(account));

        // Update UI immediately
        const statusElement = document.getElementById('account_status');
        statusElement.textContent = 'Active';
        statusElement.className = 'account-value active';

        // Update account actions immediately
        const accountActions = document.getElementById('account_actions');
        accountActions.innerHTML = `
            <button class="action-btn deposit">
                <i class="fas fa-plus"></i> Deposit
            </button>
            <button class="action-btn withdraw">
                <i class="fas fa-minus"></i> Withdraw
            </button>
            <button class="action-btn close">
                <i class="fas fa-times"></i> Close Account
            </button>
        `;

        // Add event listeners to new buttons
        const buttons = accountActions.getElementsByTagName('button');
        Array.from(buttons).forEach(button => {
            if (button.classList.contains('deposit')) {
                button.onclick = showDepositForm;
            } else if (button.classList.contains('withdraw')) {
                button.onclick = showWithdrawForm;
            } else if (button.classList.contains('close')) {
                button.onclick = closeAccount;
            }
        });

        // Update search history with new status
        const historyIndex = searchHistory.findIndex(item => item.accountNumber === account.account_number);
        if (historyIndex !== -1) {
            searchHistory[historyIndex].status = 'active';
            localStorage.setItem(`searchHistory_${tellerInfo.teller_number}`, JSON.stringify(searchHistory));
            
            // Update search history UI immediately
            const historyRows = document.querySelectorAll('.history-row');
            historyRows.forEach(row => {
                const accountNumberCell = row.children[2];
                if (accountNumberCell.textContent === account.account_number) {
                    const statusCell = row.children[4];
                    statusCell.textContent = 'Active';
                    statusCell.className = 'history-value status active';
                }
            });
        }

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
            updateAccountDetails([account]);
            
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
    // Show search history initially
    searchHistoryContainer.classList.remove('hidden');
    
    // Update search history display
    updateSearchHistory();

    // Add search input event listeners
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        
        if (!searchTerm) {
            // Clear account container and show search history immediately
            const accountContainer = document.querySelector('.account-container');
            accountContainer.innerHTML = '';
            searchHistoryContainer.classList.remove('hidden');
            hideLoadingIndicator();
        } else {
            // Hide search history and perform search
            searchHistoryContainer.classList.add('hidden');
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

    // Close account actions when clicking outside
    document.addEventListener('click', (e) => {
        const accountCards = document.querySelectorAll('.account-card');
        const accountActions = document.querySelectorAll('.account-actions');
        
        accountCards.forEach((card, index) => {
            if (!card.contains(e.target) && !accountActions[index].contains(e.target)) {
                accountActions[index].classList.remove('visible');
                card.classList.remove('expanded');
                const icon = card.querySelector('.toggle-icon i');
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            }
        });
    });
});
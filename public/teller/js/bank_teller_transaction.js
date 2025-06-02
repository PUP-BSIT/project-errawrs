// Get account data from URL parameters
function getAccountDataFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        number: urlParams.get('account_number'),
        name: urlParams.get('account_name'),
        balance: parseFloat(urlParams.get('balance')) || 0,
        returnUrl: urlParams.get('return_url') || 'bank_teller_search_account.html'
    };
}

// Initialize page with account data
function initializePage() {
    const accountData = getAccountDataFromURL();
    
    if (!accountData.number) {
        showNotification('No account data provided', 'error');
        setTimeout(() => {
            returnToSearch();
        }, 2000);
        return;
    }

    document.getElementById('account_number').textContent = accountData.number;
    document.getElementById('account_name').textContent = accountData.name;
    document.getElementById('account_balance').textContent = `₱${accountData.balance.toLocaleString('en-US', {
        minimumFractionDigits: 2
    })}`;
}

// Process deposit
function processDeposit() {
    const amount = parseFloat(document.getElementById('deposit_amount').value);
    const accountData = getAccountDataFromURL();

    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    // Here you would typically make an API call to process the deposit
    // For now, we'll simulate a successful deposit
    const newBalance = accountData.balance + amount;

    showTransactionReceipt('deposit', amount, accountData, newBalance);
    
    // Store the updated balance in sessionStorage
    sessionStorage.setItem('lastTransactionData', JSON.stringify({
        accountNumber: accountData.number,
        newBalance: newBalance,
        type: 'deposit',
        amount: amount,
        preserveState: true
    }));
}

// Process withdrawal
function processWithdraw() {
    const amount = parseFloat(document.getElementById('withdraw_amount').value);
    const accountData = getAccountDataFromURL();

    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    if (amount > accountData.balance) {
        showNotification('Insufficient funds', 'error');
        return;
    }

    // Here you would typically make an API call to process the withdrawal
    // For now, we'll simulate a successful withdrawal
    const newBalance = accountData.balance - amount;

    showTransactionReceipt('withdraw', amount, accountData, newBalance);
    
    // Store the updated balance in sessionStorage
    sessionStorage.setItem('lastTransactionData', JSON.stringify({
        accountNumber: accountData.number,
        newBalance: newBalance,
        type: 'withdraw',
        amount: amount,
        preserveState: true
    }));
}

// Show transaction receipt
function showTransactionReceipt(type, amount, accountData, newBalance) {
    const transactionContainer = document.querySelector('.transaction-container');
    
    transactionContainer.innerHTML = `
        <div class="transaction-header">
            <h2>Transaction Receipt</h2>
            <div class="account-info">
                <div class="info-item">
                    <span class="label">Transaction Type:</span>
                    <span class="value">${type === 'deposit' ? 'Deposit' : 'Withdrawal'}</span>
                </div>
                <div class="info-item">
                    <span class="label">Account Number:</span>
                    <span class="value">${accountData.number}</span>
                </div>
                <div class="info-item">
                    <span class="label">Account Name:</span>
                    <span class="value">${accountData.name}</span>
                </div>
                <div class="info-item">
                    <span class="label">Amount:</span>
                    <span class="value">₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="info-item">
                    <span class="label">Previous Balance:</span>
                    <span class="value">₱${accountData.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="info-item">
                    <span class="label">New Balance:</span>
                    <span class="value">₱${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
        <div class="form-actions">
            <button class="form-btn cancel-btn" onclick="returnToSearch()">Done</button>
            <button class="form-btn confirm-btn" onclick="processAnotherTransaction()">New Transaction</button>
        </div>
    `;

    showNotification(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} completed successfully`, 'success');
}

// Return to search page
function returnToSearch() {
    const accountData = getAccountDataFromURL();
    // Store the current account data to preserve state
    sessionStorage.setItem('lastTransactionData', JSON.stringify({
        accountNumber: accountData.number,
        newBalance: accountData.balance,
        preserveState: true
    }));
    window.location.href = accountData.returnUrl;
}

// Process another transaction
function processAnotherTransaction() {
    window.location.reload();
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification_container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 
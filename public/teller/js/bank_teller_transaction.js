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

    // Show confirmation screen first
    showTransactionConfirmation('deposit', amount, accountData);
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

    // Show confirmation screen first
    showTransactionConfirmation('withdraw', amount, accountData);
}

// Show transaction confirmation
function showTransactionConfirmation(type, amount, accountData) {
    const newBalance = type === 'deposit' ? 
        accountData.balance + amount : 
        accountData.balance - amount;

    const transactionContainer = document.querySelector('.transaction-container');
    
    transactionContainer.innerHTML = `
        <div class="transaction-header">
            <h2>Confirm ${type === 'deposit' ? 'Deposit' : 'Withdrawal'}</h2>
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
                    <span class="label">Current Balance:</span>
                    <span class="value">₱${accountData.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="info-item">
                    <span class="label">New Balance:</span>
                    <span class="value">₱${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
        <div class="form-actions">
            <button class="form-btn back-btn" onclick="window.location.reload()">Back</button>
            <button class="form-btn submit-btn" onclick="completeTransaction('${type}', ${amount})">Submit</button>
        </div>
    `;
}

// Complete transaction
function completeTransaction(type, amount) {
    const accountData = getAccountDataFromURL();
    const newBalance = type === 'deposit' ? 
        accountData.balance + amount : 
        accountData.balance - amount;

    showTransactionReceipt(type, amount, accountData, newBalance);
    
    // Store the updated balance in sessionStorage
    sessionStorage.setItem('lastTransactionData', JSON.stringify({
        accountNumber: accountData.number,
        newBalance: newBalance,
        type: type,
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

// Transaction handling for deposits and withdrawals
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo') || '{}');
    if (!tellerInfo.teller_number) {
        window.location.href = 'bank_teller_login.html';
        return;
    }

    // Get form elements
    const depositForm = document.getElementById('depositForm');
    const withdrawForm = document.getElementById('withdrawForm');
    
    // Handle deposit form submission
    if (depositForm) {
        depositForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                // Show loading state
                document.getElementById('depositButton').disabled = true;
                document.getElementById('depositStatus').textContent = 'Processing deposit...';
                
                // Get form data
                const accountNumber = document.getElementById('accountNumber').value;
                const amount = parseFloat(document.getElementById('amount').value);
                const description = document.getElementById('description').value || 'Cash deposit';
                
                // Validate amount
                if (isNaN(amount) || amount <= 0) {
                    throw new Error('Please enter a valid amount');
                }
                
                // Make API call
                const response = await fetch('../src/api/teller/deposit.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        account_number: accountNumber,
                        amount: amount,
                        teller_number: tellerInfo.teller_number,
                        description: description
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    document.getElementById('depositStatus').textContent = 'Deposit successful!';
                    document.getElementById('depositStatus').style.color = 'green';
                    
                    // Update transaction details
                    document.getElementById('transactionDetails').innerHTML = `
                        <h3>Transaction Details</h3>
                        <p>Transaction ID: ${data.data.transaction_id}</p>
                        <p>Amount: $${data.data.deposit_amount}</p>
                        <p>New Balance: $${data.data.new_balance}</p>
                        <p>Date: ${data.data.transaction_date}</p>
                        <p>Status: ${data.data.status}</p>
                    `;
                    
                    // Reset form
                    depositForm.reset();
                } else {
                    throw new Error(data.error || 'Deposit failed');
                }
                
            } catch (error) {
                // Show error message
                document.getElementById('depositStatus').textContent = error.message;
                document.getElementById('depositStatus').style.color = 'red';
            } finally {
                document.getElementById('depositButton').disabled = false;
            }
        });
    }
    
    // Handle withdraw form submission
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                // Show loading state
                document.getElementById('withdrawButton').disabled = true;
                document.getElementById('withdrawStatus').textContent = 'Processing withdrawal...';
                
                // Get form data
                const accountNumber = document.getElementById('accountNumber').value;
                const amount = parseFloat(document.getElementById('amount').value);
                const description = document.getElementById('description').value || 'Cash withdrawal';
                
                // Validate amount
                if (isNaN(amount) || amount <= 0) {
                    throw new Error('Please enter a valid amount');
                }
                
                // Make API call
                const response = await fetch('../src/api/teller/withdraw.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        account_number: accountNumber,
                        amount: amount,
                        teller_number: tellerInfo.teller_number,
                        description: description
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    document.getElementById('withdrawStatus').textContent = 'Withdrawal successful!';
                    document.getElementById('withdrawStatus').style.color = 'green';
                    
                    // Update transaction details
                    document.getElementById('transactionDetails').innerHTML = `
                        <h3>Transaction Details</h3>
                        <p>Transaction ID: ${data.data.transaction_id}</p>
                        <p>Amount: $${data.data.withdrawal_amount}</p>
                        <p>New Balance: $${data.data.new_balance}</p>
                        <p>Date: ${data.data.transaction_date}</p>
                        <p>Status: ${data.data.status}</p>
                    `;
                    
                    // Reset form
                    withdrawForm.reset();
                } else {
                    throw new Error(data.error || 'Withdrawal failed');
                }
                
            } catch (error) {
                // Show error message
                document.getElementById('withdrawStatus').textContent = error.message;
                document.getElementById('withdrawStatus').style.color = 'red';
            } finally {
                document.getElementById('withdrawButton').disabled = false;
            }
        });
    }
    
    // Add account number validation
    const accountNumberInputs = document.querySelectorAll('input[name="accountNumber"]');
    accountNumberInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });
    
    // Add amount validation
    const amountInputs = document.querySelectorAll('input[name="amount"]');
    amountInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9.]/g, '');
            if (this.value.split('.').length > 2) {
                this.value = this.value.replace(/\.+$/, '');
            }
        });
    });
}); 
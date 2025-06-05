// Get account info from session storage
const account = JSON.parse(sessionStorage.getItem('currentAccount'));
const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo'));

// Define maximum withdrawal amount
const MAX_WITHDRAW_AMOUNT = 40000;

if (!account || !tellerInfo) {
    window.location.href = './bank_teller_search_account.html';
}

// Initialize page with account details
document.getElementById('account_number').textContent = account.account_number;
document.getElementById('account_name').textContent = account.user.name;
document.getElementById('current_balance').textContent = formatCurrency(account.balance);

// Create validation message element
const amountInput = document.getElementById('withdraw_amount');
const validationMessage = document.createElement('div');
validationMessage.className = 'validation-message';
amountInput.parentElement.appendChild(validationMessage);

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

// Show/hide loading overlay
function toggleLoading(show, amount = 0) {
    const overlay = document.getElementById('loading_overlay');
    if (show) {
        document.getElementById('processing_amount').textContent = formatCurrency(amount);
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// Show notification
function showNotification(message, isError = false) {
    const container = document.getElementById('notification_container');
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    container.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Update step indicators
function updateSteps(currentStep) {
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index + 1 <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// Go back to search page
function goBack() {
    // Instead of redirecting, just go back to the previous page
    window.history.back();
}

// Validate amount and update UI
function validateAmount(amount) {
    const confirmButton = document.querySelector('.btn.confirm');
    const amountInput = document.getElementById('withdraw_amount');
    
    if (amount > MAX_WITHDRAW_AMOUNT) {
        amountInput.style.borderColor = 'var(--color-red)';
        validationMessage.textContent = `Maximum withdrawal amount is ${formatCurrency(MAX_WITHDRAW_AMOUNT)}`;
        validationMessage.style.display = 'block';
        confirmButton.disabled = true;
        return false;
    } else if (amount > account.balance) {
        amountInput.style.borderColor = 'var(--color-red)';
        validationMessage.textContent = 'Insufficient balance';
        validationMessage.style.display = 'block';
        confirmButton.disabled = true;
        return false;
    } else {
        amountInput.style.borderColor = '';
        validationMessage.style.display = 'none';
        confirmButton.disabled = false;
        return true;
    }
}

// Confirm amount and show confirmation screen
function confirmAmount() {
    const amount = parseFloat(document.getElementById('withdraw_amount').value);
    
    if (isNaN(amount) || amount <= 0) {
        validationMessage.textContent = 'Please enter a valid amount';
        validationMessage.style.display = 'block';
        return;
    }

    if (!validateAmount(amount)) {
        return;
    }

    // Update confirmation screen
    document.getElementById('confirm_account_number').textContent = account.account_number;
    document.getElementById('confirm_account_name').textContent = account.user.name;
    document.getElementById('confirm_current_balance').textContent = formatCurrency(account.balance);
    document.getElementById('confirm_amount').textContent = formatCurrency(amount);
    document.getElementById('new_balance').textContent = formatCurrency(account.balance - amount);

    // Hide amount entry, show confirmation
    document.getElementById('amount_entry').classList.add('hidden');
    document.getElementById('confirmation').classList.remove('hidden');
    
    // Update steps
    updateSteps(2);
}

// Submit withdrawal
async function submitWithdrawal() {
    const amount = parseFloat(document.getElementById('withdraw_amount').value);
    const submitButton = document.querySelector('#confirmation .btn.confirm');
    
    // Disable submit button and show loading
    submitButton.disabled = true;
    toggleLoading(true, amount);
    
    try {
        const response = await fetch('/project-errawrs/src/api/teller/withdraw.php', {
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
            throw new Error(data.error || 'Failed to process withdrawal');
        }

        // Parse the new balance from the response
        const newBalance = parseFloat(data.data.new_balance.replace(/[^0-9.-]+/g, ''));

        // Update receipt
        document.getElementById('transaction_id').textContent = data.data.transaction_id;
        document.getElementById('receipt_account_number').textContent = data.data.account_number;
        document.getElementById('receipt_account_name').textContent = account.user.name;
        document.getElementById('receipt_amount').textContent = formatCurrency(amount);
        document.getElementById('receipt_new_balance').textContent = formatCurrency(newBalance);
        document.getElementById('transaction_date').textContent = data.data.transaction_date;
        document.getElementById('teller_number').textContent = data.data.teller_number;

        // Hide loading before showing receipt
        toggleLoading(false);

        // Hide confirmation, show receipt
        document.getElementById('confirmation').classList.add('hidden');
        document.getElementById('receipt').classList.remove('hidden');
        
        // Update steps
        updateSteps(3);

        // Update the current balance display
        document.getElementById('current_balance').textContent = formatCurrency(newBalance);

        // Update session storage with new balance
        account.balance = newBalance;
        sessionStorage.setItem('currentAccount', JSON.stringify(account));

        // Update parent window if it exists
        if (window.opener && !window.opener.closed) {
            try {
                // Update the parent window's session storage first
                window.opener.sessionStorage.setItem('currentAccount', JSON.stringify(account));
                
                // Call the updateAccountBalance function in the parent window
                if (window.opener.updateAccountBalance) {
                    window.opener.updateAccountBalance(newBalance);
                }
            } catch (error) {
                console.error('Error updating parent window:', error);
            }
        }

        // Show success notification
        showNotification('Withdrawal successful');

    } catch (error) {
        console.error('Withdrawal error:', error);
        showNotification(error.message || 'Error processing withdrawal', true);
        submitButton.disabled = false;
        toggleLoading(false);
    }
}

// Back to amount entry
function backToAmount() {
    document.getElementById('confirmation').classList.add('hidden');
    document.getElementById('amount_entry').classList.remove('hidden');
    updateSteps(1);
}

// Finish transaction and return to search
function finishTransaction() {
    // Update the parent window's session storage to trigger a refresh
    if (window.opener && !window.opener.closed) {
        try {
            // Get the latest account data
            const currentAccount = JSON.parse(sessionStorage.getItem('currentAccount'));
            
            // Update parent window's storage
            window.opener.sessionStorage.setItem('currentAccount', JSON.stringify(currentAccount));
            
            // Trigger update in parent window
            if (window.opener.updateAccountBalance) {
                window.opener.updateAccountBalance(currentAccount.balance);
            }
        } catch (error) {
            console.error('Error updating parent window:', error);
        }
    }
    
    // Go back to the previous page
    window.history.back();
}

// Add input validation
document.getElementById('withdraw_amount').addEventListener('input', function(e) {
    let value = e.target.value;
    
    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts.length > 1) {
        parts[1] = parts[1].slice(0, 2);
        value = parts.join('.');
    }
    
    e.target.value = value;
    
    // Validate amount after input
    if (value === '') {
        validationMessage.style.display = 'none';
    } else {
        validateAmount(parseFloat(value) || 0);
    }
}); 
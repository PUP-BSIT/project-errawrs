// Get account info from session storage
const account = JSON.parse(sessionStorage.getItem('currentAccount'));
const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo'));

if (!account || !tellerInfo) {
    window.location.href = './bank_teller_search_account.html';
}

// Initialize page with account details
document.getElementById('account_number').textContent = account.account_number;
document.getElementById('account_name').textContent = account.user.name;
document.getElementById('current_balance').textContent = formatCurrency(account.balance);

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
    window.location.href = './bank_teller_search_account.html';
}

// Confirm amount and show confirmation screen
function confirmAmount() {
    const amount = parseFloat(document.getElementById('withdraw_amount').value);
    
    if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount', true);
        return;
    }

    if (amount > account.balance) {
        showNotification('Insufficient balance', true);
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

// Back to amount entry
function backToAmount() {
    document.getElementById('confirmation').classList.add('hidden');
    document.getElementById('amount_entry').classList.remove('hidden');
    updateSteps(1);
}

// Submit withdrawal
async function submitWithdrawal() {
    const amount = parseFloat(document.getElementById('withdraw_amount').value);
    
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

        // Update receipt
        document.getElementById('transaction_id').textContent = data.data.transaction_id;
        document.getElementById('receipt_account_number').textContent = data.data.account_number;
        document.getElementById('receipt_account_name').textContent = account.user.name;
        document.getElementById('receipt_amount').textContent = formatCurrency(amount);
        document.getElementById('receipt_new_balance').textContent = data.data.new_balance;
        document.getElementById('transaction_date').textContent = data.data.transaction_date;
        document.getElementById('teller_number').textContent = data.data.teller_number;

        // Hide confirmation, show receipt
        document.getElementById('confirmation').classList.add('hidden');
        document.getElementById('receipt').classList.remove('hidden');
        
        // Update steps
        updateSteps(3);

        // Update session storage with new balance
        account.balance = parseFloat(data.data.new_balance.replace(/[^0-9.-]+/g, ''));
        sessionStorage.setItem('currentAccount', JSON.stringify(account));

        // Show success notification
        showNotification('Withdrawal successful');

    } catch (error) {
        console.error('Withdrawal error:', error);
        showNotification(error.message || 'Error processing withdrawal', true);
    }
}

// Finish transaction and return to search
function finishTransaction() {
    window.location.href = './bank_teller_search_account.html';
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
}); 
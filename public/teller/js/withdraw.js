// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "./bank_teller_login.html";
}

// Configuration - Dynamic base URL detection
function getBaseURL() {
    const host = window.location.hostname;
    
    // Check if we're on the EC2 server
    if (host === 'dev-teller.stackovercash.site') {
        return '/api';
    }
    
    // Local XAMPP environment
    return '/project-errawrs/src/api';
}

// Get the API base URL
const API_BASE_URL = getBaseURL();

// Define maximum withdrawal amount
const MAX_WITHDRAW_AMOUNT = 300000;

if (!tellerInfo) {
    window.location.href = './bank_teller_login.html';
} else {
    // Display teller name when page loads
    const userNameElements = document.querySelectorAll('.user-name');
    const avatarElement = document.querySelector('.user-avatar.dynamic-avatar');
    let fullName = '';
    
    if (tellerInfo.first_name && tellerInfo.last_name) {
        fullName = `${tellerInfo.first_name} ${tellerInfo.last_name}`;
        userNameElements.forEach(el => el.textContent = fullName);
    } else if (tellerInfo.name) {
        fullName = tellerInfo.name;
        userNameElements.forEach(el => el.textContent = tellerInfo.name);
    }
    
    // Set avatar initial
    if (avatarElement && fullName) {
        const initial = fullName.trim().charAt(0).toUpperCase();
        avatarElement.textContent = initial;
    }
}

let selectedAccount = null;

// Check for stored account info
const storedAccount = sessionStorage.getItem('selectedAccount');
if (storedAccount) {
    selectedAccount = JSON.parse(storedAccount);
    // Clear the stored account to prevent it from persisting
    sessionStorage.removeItem('selectedAccount');
    
    // Auto-fill the form
    document.getElementById('account_number_input').value = selectedAccount.account_number;
    updateDisplayedBalance();
}

// Initialize page
function updateDisplayedBalance() {
    if (selectedAccount) {
        document.getElementById('account_name').textContent = selectedAccount.user.name;
        document.getElementById('current_balance').textContent = formatCurrency(selectedAccount.balance);
        
        // Update account status display
        const statusElement = document.getElementById('account_status');
        if (selectedAccount.status === 'closed') {
            statusElement.textContent = 'CLOSED';
            statusElement.className = 'account-status closed';
        } else {
            statusElement.textContent = '';
            statusElement.className = 'account-status';
        }
    } else {
        document.getElementById('account_name').textContent = '';
        document.getElementById('current_balance').textContent = '';
        document.getElementById('account_status').textContent = '';
    }
}

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

// Account search functionality
const accountInput = document.getElementById('account_number_input');
const suggestionsDiv = document.getElementById('account_suggestions');
const searchSpinner = document.getElementById('search_spinner');
const clearSearchBtn = document.getElementById('clear_search_btn');
let searchTimeout = null;

// Clear search functionality
function clearSearch() {
    accountInput.value = '';
    selectedAccount = null;
    updateDisplayedBalance();
    suggestionsDiv.classList.remove('active');
    clearSearchBtn.style.display = 'none';
    validateAmount(parseFloat(amountInput.value) || 0);
}

// Show/hide clear button based on input value
function toggleClearButton() {
    if (accountInput.value.trim().length > 0) {
        clearSearchBtn.style.display = 'flex';
    } else {
        clearSearchBtn.style.display = 'none';
    }
}

// Add event listeners for clear functionality
clearSearchBtn.addEventListener('click', clearSearch);
accountInput.addEventListener('input', toggleClearButton);

accountInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Reset selected account
    selectedAccount = null;
    updateDisplayedBalance();
    validateAmount(parseFloat(amountInput.value) || 0);
    
    // Set new timeout to prevent too many requests
    searchTimeout = setTimeout(async () => {
        if (searchTerm.length > 0) {
            try {
                searchSpinner.classList.add('active');
                
                const response = await fetch('/project-errawrs/src/api/teller/search_account.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        search: searchTerm,
                        teller_number: tellerInfo.teller_number
                    })
                });

                const data = await response.json();

                if (data.success && data.accounts.length > 0) {
                    suggestionsDiv.innerHTML = '';
                    data.accounts.forEach(account => {
                        const div = document.createElement('div');
                        div.className = `suggestion-item${account.status === 'closed' ? ' closed' : ''}`;
                        
                        const accountInfo = document.createElement('div');
                        accountInfo.className = 'account-info';
                        
                        const accountNumber = document.createElement('div');
                        accountNumber.className = 'account-number';
                        accountNumber.textContent = account.account_number;
                        
                        const accountName = document.createElement('div');
                        accountName.className = 'account-name';
                        accountName.textContent = account.user.name;
                        
                        accountInfo.appendChild(accountNumber);
                        accountInfo.appendChild(accountName);
                        div.appendChild(accountInfo);
                        
                        if (account.status === 'closed') {
                            const statusBadge = document.createElement('div');
                            statusBadge.className = 'status-badge closed';
                            statusBadge.textContent = 'CLOSED';
                            div.appendChild(statusBadge);
                            
                            // Add click handler to show message for closed accounts
                            div.addEventListener('click', () => {
                                showNotification('This account is closed. Please reopen the account to make transactions.', true);
                            });
                        } else {
                            div.addEventListener('click', () => selectAccount(account));
                        }
                        
                        suggestionsDiv.appendChild(div);
                    });
                    suggestionsDiv.classList.add('active');
                } else {
                    suggestionsDiv.classList.remove('active');
                }
            } catch (error) {
                console.error('Search error:', error);
                showNotification('Error searching for accounts', true);
            } finally {
                searchSpinner.classList.remove('active');
            }
        } else {
            suggestionsDiv.classList.remove('active');
        }
    }, 300);
});

// Select account from suggestions
function selectAccount(account) {
    selectedAccount = account;
    accountInput.value = account.account_number;
    suggestionsDiv.classList.remove('active');
    
    // Parse and format the balance correctly
    selectedAccount.balance = parseFloat(account.balance.replace(/[^0-9.-]+/g, ''));
    
    updateDisplayedBalance();
    validateAmount(parseFloat(amountInput.value) || 0);
}

// Click outside to close suggestions
document.addEventListener('click', function(e) {
    if (!accountInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.classList.remove('active');
    }
});

// Validate amount and update UI
function validateAmount(amount) {
    const confirmButton = document.querySelector('.btn.confirm');
    const amountInput = document.getElementById('withdraw_amount');
    
    if (!selectedAccount) {
        amountInput.style.borderColor = '';
        validationMessage.style.display = 'none';
        confirmButton.classList.remove('active');
        return false;
    }
    
    if (selectedAccount.status === 'closed') {
        amountInput.style.borderColor = 'var(--color-red)';
        validationMessage.textContent = 'Cannot withdraw from a closed account';
        validationMessage.style.display = 'block';
        confirmButton.classList.remove('active');
        return false;
    }

    // If amount is empty or not entered yet, don't show error
    if (amountInput.value === '') {
        amountInput.style.borderColor = '';
        validationMessage.style.display = 'none';
        confirmButton.classList.remove('active');
        return false;
    }
    
    if (isNaN(amount) || amount <= 0) {
        amountInput.style.borderColor = 'var(--color-red)';
        validationMessage.textContent = 'Please enter a valid amount';
        validationMessage.style.display = 'block';
        confirmButton.classList.remove('active');
        return false;
    } else if (amount > MAX_WITHDRAW_AMOUNT) {
        amountInput.style.borderColor = 'var(--color-red)';
        validationMessage.textContent = `Maximum withdrawal amount is ${formatCurrency(MAX_WITHDRAW_AMOUNT)}`;
        validationMessage.style.display = 'block';
        confirmButton.classList.remove('active');
        return false;
    } else if (amount > selectedAccount.balance) {
        amountInput.style.borderColor = 'var(--color-red)';
        validationMessage.textContent = 'Insufficient balance';
        validationMessage.style.display = 'block';
        confirmButton.classList.remove('active');
        return false;
    } else {
        amountInput.style.borderColor = '';
        validationMessage.style.display = 'none';
        confirmButton.classList.add('active');
        return true;
    }
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
    notification.className = `notification ${isError ? 'error' : 'success'}`;
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

// Confirm amount and show confirmation screen
function confirmAmount() {
    const amount = parseFloat(document.getElementById('withdraw_amount').value);
    
    if (!validateAmount(amount)) {
        return;
    }

    const newBalance = selectedAccount.balance - amount;

    // Update confirmation screen
    document.getElementById('confirm_account_number').textContent = selectedAccount.account_number;
    document.getElementById('confirm_account_name').textContent = selectedAccount.user.name;
    document.getElementById('confirm_current_balance').textContent = formatCurrency(selectedAccount.balance);
    document.getElementById('confirm_amount').textContent = formatCurrency(amount);
    document.getElementById('new_balance').textContent = formatCurrency(newBalance);

    // Hide amount entry, show confirmation
    document.getElementById('amount_entry').classList.add('hidden');
    document.getElementById('confirmation').classList.remove('hidden');
    
    // Enable submit button
    const submitButton = document.querySelector('#confirmation .btn.confirm');
    submitButton.disabled = false;
    submitButton.classList.add('active');
    
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
                account_number: selectedAccount.account_number,
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
        document.getElementById('receipt_account_name').textContent = selectedAccount.user.name;
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

        // Update account balance
        selectedAccount.balance = newBalance;
        sessionStorage.setItem('currentAccount', JSON.stringify(selectedAccount));
        updateDisplayedBalance();

        // Update parent window if it exists
        if (window.opener && !window.opener.closed) {
            try {
                // Update the parent window's session storage
                window.opener.sessionStorage.setItem('currentAccount', JSON.stringify(selectedAccount));
                
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

// Finish transaction and return to search
function finishTransaction() {
    // Clear the form
    document.getElementById('account_number_input').value = '';
    document.getElementById('withdraw_amount').value = '';
    document.getElementById('account_name').textContent = '';
    document.getElementById('current_balance').textContent = '';
    document.getElementById('account_status').textContent = '';
    selectedAccount = null;
    
    // Hide confirmation and receipt, show amount entry
    document.getElementById('confirmation').classList.add('hidden');
    document.getElementById('receipt').classList.add('hidden');
    document.getElementById('amount_entry').classList.remove('hidden');
    
    // Reset steps
    updateSteps(1);
    
    // Clear validation states
    const confirmButton = document.querySelector('.btn.confirm');
    confirmButton.classList.remove('active');
    document.querySelector('.validation-message').style.display = 'none';
    document.getElementById('withdraw_amount').style.borderColor = '';
}

// Add input validation for amount
amountInput.addEventListener('input', function(e) {
    let value = e.target.value;
    
    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 10 digits before decimal point
    if (parts[0].length > 10) {
        parts[0] = parts[0].slice(0, 10);
    }
    
    // Limit to 2 decimal places
    if (parts.length > 1) {
        parts[1] = parts[1].slice(0, 2);
        value = parts.join('.');
    }
    
    e.target.value = value;
    
    // Validate amount after input
    validateAmount(parseFloat(value) || 0);
});

// Handle withdrawal form submission
async function handleWithdrawal(event) {
    event.preventDefault();

    const accountNumber = document.getElementById('account_number').value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;

    // Basic validation
    if (!accountNumber || !amount) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        // First, verify the account exists and is active
        const accountResponse = await fetch(`${API_BASE_URL}/teller/search_account.php?search=${encodeURIComponent(accountNumber)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`, {
            credentials: 'include'
        });
        const accountData = await accountResponse.json();

        if (!accountData.success || !accountData.account) {
            showNotification('Account not found or inactive', 'error');
            return;
        }

        // Check if withdrawal amount is within available balance
        if (parseFloat(amount) > parseFloat(accountData.account.balance)) {
            showNotification('Insufficient balance', 'error');
            return;
        }

        // Proceed with withdrawal
        const response = await fetch(`${API_BASE_URL}/teller/withdraw.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                account_number: accountNumber,
                amount: amount,
                description: description,
                teller_number: tellerInfo.teller_number
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Withdrawal successful', 'success');
            // Clear form
            document.getElementById('withdrawal_form').reset();
        } else {
            showNotification(data.error || 'Failed to process withdrawal', 'error');
        }
    } catch (error) {
        console.error('Withdrawal error:', error);
        showNotification('Error processing withdrawal', 'error');
    }
} 
// Sample account data
const accountDatabase = {
    2023123456: {
        number: "2023123456",
        name: "Juan Dela Cruz",
        type: "Savings",
        balance: 25750.0,
        status: "Active",
    },
    2023987654: {
        number: "2023987654",
        name: "Maria Santos",
        type: "Checking",
        balance: 45000.0,
        status: "Active",
    },
    2023567890: {
        number: "2023567890",
        name: "Carlo Mendoza",
        type: "Savings",
        balance: 12500.5,
        status: "Active",
    },
    2023344556: {
        number: "2023344556",
        name: "Robert Lim",
        type: "Checking",
        balance: 78900.25,
        status: "Active",
    },
    3315746283: {
        number: "3315746283",
        name: "Sample Account",
        type: "Savings",
        balance: 50000.0,
        status: "Active",
    },
};

let currentAccount = null;
let currentTransactionType = null;
let isDropdownOpen = false;

// Search account function
function searchAccount() {
    const searchInput = document.getElementById("searchInput");
    const accountNumber = searchInput.value.trim();

    if (accountNumber.length >= 10) {
        const account = accountDatabase[accountNumber];
        if (account) {
            // Only hide actions if selecting a different account
            if (!currentAccount || currentAccount.number !== account.number) {
                hideAccountActions();
            }
            displayAccountDetails(account);
            addToSearchHistory(account.name, account.number);
        } else {
            hideAccountDetails();
            hideAccountActions();
        }
    } else {
        hideAccountDetails();
        hideAccountActions();
    }
}

// Display account details
function displayAccountDetails(account) {
    currentAccount = account;

    document.getElementById("accountNumber").textContent = account.number;
    document.getElementById("accountName").textContent = account.name;
    document.getElementById("accountType").textContent = account.type;
    document.getElementById(
        "accountBalance"
    ).textContent = `₱${account.balance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
    })}`;

    const statusElement = document.getElementById("accountStatus");
    if (account.status === "Active") {
        statusElement.innerHTML = `
            <div class="status-icon">✓</div>
            ${account.status}
        `;
        statusElement.className = "status-active";
    } else {
        statusElement.innerHTML = `
            <div class="status-icon">✗</div>
            ${account.status}
        `;
        statusElement.className = "status-inactive";
    }

    const accountDetails = document.getElementById("accountDetails");
    
    // Add chevron icon if it doesn't exist
    if (!accountDetails.querySelector('.account-chevron')) {
        const chevron = document.createElement('i');
        chevron.className = 'fas fa-chevron-right account-chevron';
        accountDetails.appendChild(chevron);
    }

    accountDetails.style.display = "flex";

    // Reset animation
    accountDetails.style.animation = "none";
    accountDetails.offsetHeight; // Trigger reflow
    accountDetails.style.animation = "slideIn 0.5s ease forwards";

    // Add click event listener to the account details card
    accountDetails.onclick = function() {
        const chevron = this.querySelector('.account-chevron');
        chevron.classList.toggle('rotated');
        toggleAccountActions();
    };
}

// Hide account details
function hideAccountDetails() {
    document.getElementById("accountDetails").style.display = "none";
    hideAccountActions(); // Make sure to hide actions when hiding details
    currentAccount = null;
}

// Toggle account actions dropdown
function toggleAccountActions() {
    if (!currentAccount) return;

    const existingActions = document.querySelector(".actions-container");
    
    if (existingActions) {
        existingActions.remove();
        return;
    }

    // Show new actions
    showAccountActions();
}

// Show account actions dropdown
function showAccountActions() {
    const accountDetails = document.querySelector(".account-details");
    const mainContent = document.querySelector(".main-content");
    
    // Check if action buttons container already exists
    let actionContainer = mainContent.querySelector(".actions-container");
    if (actionContainer) {
        actionContainer.remove(); // Remove existing container
    }

    // Create action buttons HTML with conditional display based on account status
    const actionButtonsHTML = `
        <div class="actions-container status-${currentAccount.status.toLowerCase()}">
            <button class="action-deposit" onclick="showDepositForm()">
                <i class="fas fa-plus"></i>
                Deposit
            </button>
            <button class="action-withdraw" onclick="showWithdrawForm()">
                <i class="fas fa-minus"></i>
                Withdraw
            </button>
            <button class="action-close" onclick="closeAccount()">
                <i class="fas fa-times-circle"></i>
                Close Account
            </button>
            <button class="action-reopen" onclick="reopenAccount()">
                <i class="fas fa-check-circle"></i>
                Re-open Account
            </button>
        </div>
    `;

    // Insert the action buttons container after the account details container
    accountDetails.insertAdjacentHTML('afterend', actionButtonsHTML);

    isDropdownOpen = true;
}

// Hide account actions
function hideAccountActions() {
    const actionContainer = document.querySelector(".actions-container");
    if (actionContainer) {
        actionContainer.remove();
    }
    isDropdownOpen = false;
}

// Hide transaction form
function hideTransactionForm() {
    const overlay = document.getElementById('transactionOverlay');
    overlay.classList.remove('show');
    setTimeout(() => {
        overlay.style.display = 'none';
        // Reset the form to its initial state
        const container = overlay.querySelector('.transaction-container');
        container.innerHTML = `
            <div class="transaction-header">
                <h2>Deposit</h2>
                <p>Current Balance: ₱${currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="transaction-form">
                <div class="form-group">
                    <label for="overlayAmount">Enter Amount</label>
                    <input type="number" id="overlayAmount" placeholder="₱0.00" step="0.01" min="0">
                </div>
                <div class="form-actions">
                    <button class="form-btn cancel-btn" onclick="hideTransactionForm()">Cancel</button>
                    <button class="form-btn confirm-btn" onclick="showTransactionReceipt('deposit')">Confirm</button>
                </div>
            </div>
        `;
        document.getElementById('overlayAmount').value = ''; // Clear input
    }, 300);
}

// Show deposit form
function showDepositForm() {
    const overlay = document.getElementById('transactionOverlay');
    const container = overlay.querySelector('.transaction-container');
    
    // Reset the form to deposit state
    container.innerHTML = `
        <div class="transaction-header">
            <h2>Deposit</h2>
            <p>Current Balance: ₱${currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div class="transaction-form">
            <div class="form-group">
                <label for="overlayAmount">Enter Amount</label>
                <input type="number" id="overlayAmount" placeholder="₱0.00" step="0.01" min="0">
            </div>
            <div class="form-actions">
                <button class="form-btn cancel-btn" onclick="hideTransactionForm()">Cancel</button>
                <button class="form-btn confirm-btn" onclick="showTransactionReceipt('deposit')">Confirm</button>
            </div>
        </div>
    `;

    overlay.style.display = 'block';
    setTimeout(() => overlay.classList.add('show'), 10);
    document.getElementById('overlayAmount').focus();
}

// Show withdraw form
function showWithdrawForm() {
    const overlay = document.getElementById('transactionOverlay');
    const container = overlay.querySelector('.transaction-container');
    
    // Reset the form to withdraw state
    container.innerHTML = `
        <div class="transaction-header">
            <h2>Withdraw</h2>
            <p>Current Balance: ₱${currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div class="transaction-form">
            <div class="form-group">
                <label for="overlayAmount">Enter Amount</label>
                <input type="number" id="overlayAmount" placeholder="₱0.00" step="0.01" min="0">
            </div>
            <div class="form-actions">
                <button class="form-btn cancel-btn" onclick="hideTransactionForm()">Cancel</button>
                <button class="form-btn confirm-btn" onclick="showTransactionReceipt('withdraw')">Confirm</button>
            </div>
        </div>
    `;

    overlay.style.display = 'block';
    setTimeout(() => overlay.classList.add('show'), 10);
    document.getElementById('overlayAmount').focus();
}

// Show transaction receipt for confirmation
function showTransactionReceipt(type) {
    const amountInput = document.getElementById('overlayAmount');
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        alert('Please enter a valid amount.');
        return;
    }

    if (type === 'withdraw' && amount > currentAccount.balance) {
        alert('Insufficient funds.');
        return;
    }

    const newBalance = type === 'deposit' ? 
        currentAccount.balance + amount : 
        currentAccount.balance - amount;

    const overlay = document.getElementById('transactionOverlay');
    const container = overlay.querySelector('.transaction-container');

    container.innerHTML = `
        <div class="transaction-header">
            <h2>Transaction Receipt</h2>
            <div class="receipt-content">
                <div class="receipt-item">
                    <span>Transaction Type:</span>
                    <span>${type === 'deposit' ? 'Deposit' : 'Withdrawal'}</span>
                </div>
                <div class="receipt-item">
                    <span>Account Number:</span>
                    <span>${currentAccount.number}</span>
                </div>
                <div class="receipt-item">
                    <span>Account Name:</span>
                    <span>${currentAccount.name}</span>
                </div>
                <div class="receipt-item">
                    <span>Current Balance:</span>
                    <span>₱${currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="receipt-item">
                    <span>${type === 'deposit' ? 'Deposit' : 'Withdrawal'} Amount:</span>
                    <span>₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="receipt-item total">
                    <span>New Balance:</span>
                    <span>₱${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
        <div class="form-actions">
            <button class="form-btn cancel-btn" onclick="hideTransactionForm()">Cancel</button>
            <button class="form-btn confirm-btn" onclick="processTransaction('${type}', ${amount})">Submit</button>
        </div>
    `;
}

// Process transaction and complete
function processTransaction(type, amount) {
    const oldBalance = currentAccount.balance;
    const newBalance = type === 'deposit' ? oldBalance + amount : oldBalance - amount;

    // Update account balance
    currentAccount.balance = newBalance;
    accountDatabase[currentAccount.number].balance = newBalance;

    // Add transaction to history
    const reference = `${type.charAt(0).toUpperCase() + type.slice(1)} - Acc: #${currentAccount.number}`;
    addTransactionToHistory(type, amount, reference);

    // Update display
    document.getElementById('accountBalance').textContent = `₱${newBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2
    })}`;

    // Show completion message
    const overlay = document.getElementById('transactionOverlay');
    const container = overlay.querySelector('.transaction-container');

    container.innerHTML = `
        <div class="transaction-header">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2>Transaction Complete</h2>
            <p>Your ${type === 'deposit' ? 'deposit' : 'withdrawal'} has been processed successfully.</p>
        </div>
        <div class="transaction-summary">
            <div class="summary-item">
                <span>Transaction Type:</span>
                <span>${type === 'deposit' ? 'Deposit' : 'Withdrawal'}</span>
            </div>
            <div class="summary-item">
                <span>Amount:</span>
                <span>₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-item total">
                <span>New Balance:</span>
                <span>₱${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
        </div>
        <div class="form-actions">
            <button class="form-btn confirm-btn" onclick="hideTransactionForm()">Done</button>
        </div>
    `;
}

// Function to add transaction to history
function addTransactionToHistory(type, amount, reference, status = "Success") {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Create new transaction object
    const newTransaction = {
        id: Date.now(), // Use timestamp as unique ID
        date: today,
        type: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
        amount: `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        reference: reference || 'Over-the-counter',
        status: status
    };

    // Get existing history data
    let historyData = JSON.parse(localStorage.getItem('transactionHistory') || '[]');
    
    // Add new transaction at the beginning of the array
    historyData.unshift(newTransaction);
    
    // Store updated history
    localStorage.setItem('transactionHistory', JSON.stringify(historyData));
}

// Close account
function closeAccount() {
    if (currentAccount.balance > 0) {
        alert(`Cannot close account ${currentAccount.number}. Account balance must be zero. Current balance: ₱${currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        return;
    }

    if (confirm(`Are you sure you want to close account ${currentAccount.number}?`)) {
        currentAccount.status = "Inactive";
        accountDatabase[currentAccount.number].status = "Inactive";

        // Update status display
        const statusElement = document.getElementById("accountStatus");
        statusElement.innerHTML = `
            <div class="status-icon">✗</div>
            ${currentAccount.status}
        `;
        statusElement.className = "status-inactive";

        // Hide current actions and show updated actions
        hideAccountActions();
        showAccountActions();
    }
}

// Reopen account
function reopenAccount() {
    if (confirm(`Are you sure you want to reopen account ${currentAccount.number}?`)) {
        currentAccount.status = "Active";
        accountDatabase[currentAccount.number].status = "Active";

        // Update status display
        const statusElement = document.getElementById("accountStatus");
        statusElement.innerHTML = `
            <div class="status-icon">✓</div>
            ${currentAccount.status}
        `;
        statusElement.className = "status-active";

        // Hide current actions and show updated actions
        hideAccountActions();
        showAccountActions();
    }
}

// Add to search history
function addToSearchHistory(name, accountNumber) {
    const historyBody = document.getElementById("historyBody");
    const existingRows = historyBody.querySelectorAll(".history-row");

    // Remove if this account already exists in history
    existingRows.forEach((row) => {
        const accountCell = row.children[2];
        if (accountCell && accountCell.textContent === accountNumber) {
            row.remove();
        }
    });

    // Create new row for the searched account
    const newRow = document.createElement("div");
    newRow.className = "history-row";
    newRow.onclick = () => selectFromHistory(name, accountNumber);
    newRow.innerHTML = `
        <div class="history-value">1</div>
        <div class="history-value">${name}</div>
        <div class="history-value">${accountNumber}</div>
    `;

    // Insert at the beginning of history
    if (historyBody.firstChild) {
        historyBody.insertBefore(newRow, historyBody.firstChild);
    } else {
        historyBody.appendChild(newRow);
    }

    // Limit history to 10 items
    const updatedRows = historyBody.querySelectorAll(".history-row");
    if (updatedRows.length > 10) {
        historyBody.removeChild(updatedRows[updatedRows.length - 1]);
    }

    // Update row numbers
    updateHistoryNumbers();
}

// Update history row numbers
function updateHistoryNumbers() {
    const historyBody = document.getElementById("historyBody");
    const rows = historyBody.querySelectorAll(".history-row");

    rows.forEach((row, index) => {
        row.children[0].textContent = index + 1;
    });
}

// Select from history
function selectFromHistory(name, accountNumber) {
    // Only proceed if selecting a different account
    if (!currentAccount || currentAccount.number !== accountNumber) {
    const searchInput = document.getElementById("searchInput");
    searchInput.value = accountNumber;
    searchAccount();
    }
}

// Handle Enter key press in search input
document
    .getElementById("searchInput")
    .addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            searchAccount();
        }
    });
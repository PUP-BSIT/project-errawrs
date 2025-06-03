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
let isDropdownOpen = false;

// Check for transaction data on page load
document.addEventListener('DOMContentLoaded', function() {
    const lastTransactionData = sessionStorage.getItem('lastTransactionData');
    if (lastTransactionData) {
        const data = JSON.parse(lastTransactionData);
        if (accountDatabase[data.accountNumber]) {
            // Update the account balance if it was a transaction
            if (data.newBalance !== undefined && !data.preserveState) {
                accountDatabase[data.accountNumber].balance = data.newBalance;
            }
            
            // Show the account details
            const searchInput = document.getElementById("search_input");
            searchInput.value = data.accountNumber;
            searchAccount();
            
            // Show notification for completed transaction
            if (data.type && !data.preserveState) {
                showNotification(`${data.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ₱${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} was successful`, 'success');
            }
            
            // Clear the transaction data
            sessionStorage.removeItem('lastTransactionData');
        }
    }
});

// Search account function
function searchAccount() {
    const searchInput = document.getElementById("search_input");
    const accountNumber = searchInput.value.trim();

    if (accountNumber.length >= 10) {
        const account = accountDatabase[accountNumber];
        if (account) {
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

    document.getElementById("account_number").textContent = account.number;
    document.getElementById("account_name").textContent = account.name;
    document.getElementById("account_type").textContent = account.type;
    document.getElementById("account_balance").textContent = `₱${account.balance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
    })}`;

    const statusElement = document.getElementById("account_status");
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

    const accountDetails = document.getElementById("account_details");
    
    if (!accountDetails.querySelector('.account-chevron')) {
        const chevron = document.createElement('i');
        chevron.className = 'fas fa-chevron-right account-chevron';
        accountDetails.appendChild(chevron);
    }

    accountDetails.classList.remove('display-none');
    accountDetails.classList.add('display-flex', 'visible');

    accountDetails.onclick = function() {
        const chevron = this.querySelector('.account-chevron');
        chevron.classList.toggle('rotated');
        toggleAccountActions();
    };
}

// Hide account details
function hideAccountDetails() {
    const accountDetails = document.getElementById("account_details");
    accountDetails.classList.remove('display-flex', 'visible');
    accountDetails.classList.add('display-none');
    hideAccountActions();
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

    showAccountActions();
}

// Show account actions dropdown
function showAccountActions() {
    const accountDetails = document.querySelector(".account-details");
    const mainContent = document.querySelector(".main-content");
    
    let actionContainer = mainContent.querySelector(".actions-container");
    if (actionContainer) {
        actionContainer.remove();
    }

    const actionButtonsHTML = `
        <div class="actions-container status-${currentAccount.status.toLowerCase()}">
            <button class="action-deposit" onclick="redirectToDeposit()">
                <i class="fas fa-plus"></i>
                Deposit
            </button>
            <button class="action-withdraw" onclick="redirectToWithdraw()">
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

// Redirect to deposit page
function redirectToDeposit() {
    if (!currentAccount) return;
    
    const returnUrl = window.location.href;
    const url = `bank_teller_deposit.html?account_number=${currentAccount.number}&account_name=${encodeURIComponent(currentAccount.name)}&balance=${currentAccount.balance}&return_url=${encodeURIComponent(returnUrl)}`;
    window.location.href = url;
}

// Redirect to withdraw page
function redirectToWithdraw() {
    if (!currentAccount) return;
    
    const returnUrl = window.location.href;
    const url = `bank_teller_withdraw.html?account_number=${currentAccount.number}&account_name=${encodeURIComponent(currentAccount.name)}&balance=${currentAccount.balance}&return_url=${encodeURIComponent(returnUrl)}`;
    window.location.href = url;
}

// Notification System
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification_container');
    const notification = document.createElement('div');
    notification.className = `notification ${type} fade-in`;
    
    let icon = '';
    switch(type) {
        case 'error':
            icon = 'fa-circle-exclamation';
            break;
        case 'success':
            icon = 'fa-circle-check';
            break;
        case 'warning':
            icon = 'fa-triangle-exclamation';
            break;
        default:
            icon = 'fa-circle-info';
    }
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    notification.onclick = () => dismissNotification(notification);
    container.appendChild(notification);
    setTimeout(() => dismissNotification(notification), 5000);
}

function dismissNotification(notification) {
    notification.classList.add('fade-out');
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 300);
}

// Close account
function closeAccount() {
    if (currentAccount.balance > 0) {
        showNotification(`Cannot close account ${currentAccount.number}. Account balance must be zero. Current balance: ₱${currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'error');
        return;
    }

    if (confirm(`Are you sure you want to close account ${currentAccount.number}?`)) {
        currentAccount.status = "Inactive";
        accountDatabase[currentAccount.number].status = "Inactive";

        const statusElement = document.getElementById("account_status");
        statusElement.innerHTML = `
            <div class="status-icon">✗</div>
            ${currentAccount.status}
        `;
        statusElement.className = "status-inactive";

        hideAccountActions();
        showAccountActions();
        
        showNotification('Account has been closed successfully.', 'success');
    }
}

// Reopen account
function reopenAccount() {
    if (confirm(`Are you sure you want to reopen account ${currentAccount.number}?`)) {
        currentAccount.status = "Active";
        accountDatabase[currentAccount.number].status = "Active";

        const statusElement = document.getElementById("account_status");
        statusElement.innerHTML = `
            <div class="status-icon">✓</div>
            ${currentAccount.status}
        `;
        statusElement.className = "status-active";

        hideAccountActions();
        showAccountActions();
        
        showNotification('Account has been reopened successfully.', 'success');
    }
}

// Add to search history
function addToSearchHistory(name, accountNumber) {
    const historyBody = document.getElementById("history_body");
    const existingRows = historyBody.querySelectorAll(".history-row");

    existingRows.forEach((row) => {
        const accountCell = row.children[2];
        if (accountCell && accountCell.textContent === accountNumber) {
            row.remove();
        }
    });

    const newRow = document.createElement("div");
    newRow.className = "history-row";
    newRow.onclick = () => selectFromHistory(name, accountNumber);
    newRow.innerHTML = `
        <div class="history-value">1</div>
        <div class="history-value">${name}</div>
        <div class="history-value">${accountNumber}</div>
    `;

    if (historyBody.firstChild) {
        historyBody.insertBefore(newRow, historyBody.firstChild);
    } else {
        historyBody.appendChild(newRow);
    }

    const updatedRows = historyBody.querySelectorAll(".history-row");
    if (updatedRows.length > 10) {
        historyBody.removeChild(updatedRows[updatedRows.length - 1]);
    }

    updateHistoryNumbers();
}

// Update history row numbers
function updateHistoryNumbers() {
    const historyBody = document.getElementById("history_body");
    const rows = historyBody.querySelectorAll(".history-row");

    rows.forEach((row, index) => {
        row.children[0].textContent = index + 1;
    });
}

// Select from history
function selectFromHistory(name, accountNumber) {
    if (!currentAccount || currentAccount.number !== accountNumber) {
        const searchInput = document.getElementById("search_input");
        searchInput.value = accountNumber;
        searchAccount();
    }
}
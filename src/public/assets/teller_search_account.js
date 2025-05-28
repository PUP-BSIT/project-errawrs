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
            displayAccountDetails(account);
            // Hide dropdown when new account is searched
            hideAccountActions();
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
    accountDetails.style.display = "flex";

    // Reset animation
    accountDetails.style.animation = "none";
    accountDetails.offsetHeight; // Trigger reflow
    accountDetails.style.animation = "slideIn 0.5s ease forwards";

    // Reset dropdown state and hide dropdown icon
    isDropdownOpen = false;
    const dropdownIcon = document.getElementById("dropdownIcon");
    dropdownIcon.style.display = "none"; // Hide the dropdown arrow icon
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

    if (isDropdownOpen) {
        hideAccountActions();
    } else {
        showAccountActions();
    }
}

// Show account actions dropdown
function showAccountActions() {
    const accountDetails = document.querySelector(".account-details");
    const mainContent = document.querySelector(".main-content");
    
    // Check if action buttons container already exists
    let actionContainer = mainContent.querySelector(".account-actions-inline");
    if (actionContainer) {
        actionContainer.remove(); // Remove existing container
    }

    // Create action buttons HTML
    const actionButtonsHTML = `
        <div class="account-actions-inline">
            <button class="action-option deposit-option" onclick="showDepositForm()" style="display: flex;">
                <i class="fas fa-plus"></i>
                Deposit
            </button>
            <button class="action-option withdraw-option" onclick="showWithdrawForm()" style="display: flex;">
                <i class="fas fa-minus"></i>
                Withdraw
            </button>
            <button class="action-option close-option" onclick="closeAccount()" style="display: flex;">
                <i class="fas fa-times-circle"></i>
                Close Account
            </button>
            <button class="action-option reopen-option" onclick="reopenAccount()" style="display: none;">
                <i class="fas fa-check-circle"></i>
                Re-open Account
            </button>
        </div>
    `;

    // Insert the action buttons container after the account details container
    accountDetails.insertAdjacentHTML('afterend', actionButtonsHTML);

    // Get the newly created container
    actionContainer = mainContent.querySelector(".account-actions-inline");
    
    // Style the container to appear as a separate box to the right
    actionContainer.style.background = "var(--color-white)";
    actionContainer.style.borderRadius = "15px";
    actionContainer.style.padding = "20px";
    actionContainer.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
    actionContainer.style.display = "flex";
    actionContainer.style.flexDirection = "column";
    actionContainer.style.gap = "15px";
    actionContainer.style.maxWidth = "250px";
    actionContainer.style.marginTop = "0";
    actionContainer.style.animation = "slideIn 0.3s ease forwards";

    // Style all buttons consistently
    const buttons = actionContainer.querySelectorAll(".action-option");
    buttons.forEach((btn) => {
        btn.style.minWidth = "auto";
        btn.style.padding = "12px 20px";
        btn.style.fontSize = "1rem";
        btn.style.fontWeight = "600";
        btn.style.borderRadius = "20px";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.transition = "all 0.3s ease";
        btn.style.justifyContent = "center";
        btn.style.alignItems = "center";
        btn.style.gap = "8px";
        btn.style.width = "100%";
    });

    isDropdownOpen = true;

    // Update action buttons based on account status
    updateActionButtons();
}

// Hide account actions dropdown
function hideAccountActions() {
    const accountSection = document.querySelector(".account-section");
    if (accountSection) {
        const actionContainer = accountSection.querySelector(".account-actions-inline");
        if (actionContainer) {
            actionContainer.remove();
        }
    }
    isDropdownOpen = false;
}

// Update action buttons based on account status
function updateActionButtons() {
    const actionContainer = document.querySelector(".account-actions-inline");
    if (!actionContainer) return;

    const depositBtn = actionContainer.querySelector(".deposit-option");
    const withdrawBtn = actionContainer.querySelector(".withdraw-option");
    const closeBtn = actionContainer.querySelector(".close-option");
    const reopenBtn = actionContainer.querySelector(".reopen-option");

    if (currentAccount.status === "Active") {
        depositBtn.style.display = "flex";
        withdrawBtn.style.display = "flex";
        closeBtn.style.display = "flex";
        reopenBtn.style.display = "none";
    } else {
        depositBtn.style.display = "none";
        withdrawBtn.style.display = "none";
        closeBtn.style.display = "none";
        reopenBtn.style.display = "flex";
    }
}

// Show deposit form
function showDepositForm() {
    currentTransactionType = "deposit";
    showTransactionForm("Deposit", "Confirm Deposit");
    hideAccountActions(); // This will restore the original account info
}

// Show withdraw form
function showWithdrawForm() {
    currentTransactionType = "withdraw";
    showTransactionForm("Withdraw", "Confirm Withdraw");
    hideAccountActions(); // This will restore the original account info
}

// Show transaction form
function showTransactionForm(title, confirmText) {
    document.getElementById("formTitle").textContent = title;
    document.getElementById("formAccountNumber").textContent =
        currentAccount.number;
    document.getElementById("confirmBtnText").textContent = confirmText;
    document.getElementById("transactionAmount").value = "";

    const form = document.getElementById("transactionForm");
    form.style.display = "block";
    form.style.animation = "slideIn 0.5s ease forwards";
}

// Hide transaction form
function hideTransactionForm() {
    document.getElementById("transactionForm").style.display = "none";
    currentTransactionType = null;
}

// Confirm transaction
function confirmTransaction() {
    const amountInput = document.getElementById("transactionAmount");
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    if (
        currentTransactionType === "withdraw" &&
        amount > currentAccount.balance
    ) {
        alert("Insufficient funds.");
        return;
    }

    // Update account balance
    if (currentTransactionType === "deposit") {
        currentAccount.balance += amount;
        accountDatabase[currentAccount.number].balance = currentAccount.balance;
    } else if (currentTransactionType === "withdraw") {
        currentAccount.balance -= amount;
        accountDatabase[currentAccount.number].balance = currentAccount.balance;
    }

    // Update display
    document.getElementById(
        "accountBalance"
    ).textContent = `₱${currentAccount.balance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
    })}`;

    // Show success modal
    showSuccessModal(amount);
    hideTransactionForm();
}

// Show success modal
function showSuccessModal(amount) {
    const modal = document.getElementById("successModal");
    const title = document.getElementById("successTitle");
    const message = document.getElementById("successMessage");

    const actionText =
        currentTransactionType === "deposit"
            ? "deposited to"
            : "withdrawn from";
    const titleText =
        currentTransactionType === "deposit"
            ? "Deposit Successful"
            : "Withdrawal Successful";

    title.textContent = titleText;
    message.textContent = `₱${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
    })} has been ${actionText} account ${currentAccount.number}`;

    modal.style.display = "flex";
    modal.style.animation = "fadeIn 0.3s ease forwards";
}

// Hide success modal
function hideSuccessModal() {
    document.getElementById("successModal").style.display = "none";
}

// Close account
function closeAccount() {
    if (
        confirm(
            `Are you sure you want to close account ${currentAccount.number}?`
        )
    ) {
        currentAccount.status = "Inactive";
        accountDatabase[currentAccount.number].status = "Inactive";

        // Update status display
        const statusElement = document.getElementById("accountStatus");
        statusElement.innerHTML = `
            <div class="status-icon">✗</div>
            ${currentAccount.status}
        `;
        statusElement.className = "status-inactive";

        hideAccountActions();
        alert("Account has been closed successfully.");
    }
}

// Reopen account
function reopenAccount() {
    if (
        confirm(
            `Are you sure you want to reopen account ${currentAccount.number}?`
        )
    ) {
        currentAccount.status = "Active";
        accountDatabase[currentAccount.number].status = "Active";

        // Update status display
        const statusElement = document.getElementById("accountStatus");
        statusElement.innerHTML = `
            <div class="status-icon">✓</div>
            ${currentAccount.status}
        `;
        statusElement.className = "status-active";

        hideAccountActions();
        alert("Account has been reopened successfully.");
    }
}

// Add to search history
function addToSearchHistory(name, accountNumber) {
    const historyBody = document.getElementById("historyBody");
    const existingRows = historyBody.querySelectorAll(".history-row");

    // Check if this account is already in history
    let accountExists = false;
    existingRows.forEach((row) => {
        const accountCell = row.children[2];
        if (accountCell && accountCell.textContent === accountNumber) {
            accountExists = true;
        }
    });

    if (!accountExists) {
        const newRowNumber = existingRows.length + 1;
        const newRow = document.createElement("div");
        newRow.className = "history-row";
        newRow.onclick = () => selectFromHistory(name, accountNumber);
        newRow.innerHTML = `
            <div class="history-value">${newRowNumber}</div>
            <div class="history-value">${name}</div>
            <div class="history-value">${accountNumber}</div>
        `;

        historyBody.appendChild(newRow);

        // Limit history to 10 items
        if (existingRows.length >= 10) {
            historyBody.removeChild(existingRows[0]);
            // Update row numbers
            updateHistoryNumbers();
        }
    }
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
    const searchInput = document.getElementById("searchInput");
    searchInput.value = accountNumber;
    searchAccount();
}

// Handle Enter key press in search input
document
    .getElementById("searchInput")
    .addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            searchAccount();
        }
    });

// Close dropdowns when clicking outside
document.addEventListener("click", function (event) {
    const accountDetails = document.getElementById("accountDetails");
    const dropdown = document.getElementById("accountActionsDropdown");
    const transactionForm = document.getElementById("transactionForm");

    if (
        !accountDetails.contains(event.target) &&
        !dropdown.contains(event.target)
    ) {
        if (isDropdownOpen && !transactionForm.style.display === "block") {
            hideAccountActions();
        }
    }
});

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
    // Focus on search input
    document.getElementById("searchInput").focus();

    // Hide all forms and modals initially
    document.getElementById("accountDetails").style.display = "none";
    document.getElementById("accountActionsDropdown").style.display = "none";
    document.getElementById("transactionForm").style.display = "none";
    document.getElementById("successModal").style.display = "none";
});
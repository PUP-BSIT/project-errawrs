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

    // Reset dropdown state
    isDropdownOpen = false;
    const dropdownIcon = document.getElementById("dropdownIcon");
    dropdownIcon.classList.remove("rotated");
}

// Hide account details
function hideAccountDetails() {
    document.getElementById("accountDetails").style.display = "none";
    hideAccountActions();
}

// Toggle account actions dropdown
function toggleAccountActions() {
    if (!currentAccount) return;

    const dropdown = document.getElementById("accountActionsDropdown");
    const dropdownIcon = document.getElementById("dropdownIcon");

    if (isDropdownOpen) {
        hideAccountActions();
    } else {
        showAccountActions();
    }
}

// Show account actions dropdown
function showAccountActions() {
    const dropdown = document.getElementById("accountActionsDropdown");
    const dropdownIcon = document.getElementById("dropdownIcon");

    dropdown.style.display = "flex";
    dropdownIcon.classList.add("rotated");
    isDropdownOpen = true;

    // Reset animation
    dropdown.style.animation = "none";
    dropdown.offsetHeight; // Trigger reflow
    dropdown.style.animation = "slideDown 0.3s ease forwards";

    // Update button visibility based on account status
    updateActionButtonsVisibility();
}

// Hide account actions dropdown
function hideAccountActions() {
    const dropdown = document.getElementById("accountActionsDropdown");
    const dropdownIcon = document.getElementById("dropdownIcon");

    dropdown.style.display = "none";
    dropdownIcon.classList.remove("rotated");
    isDropdownOpen = false;
}

// Update action buttons visibility based on account status
function updateActionButtonsVisibility() {
    const depositBtn = document.querySelector(".deposit-option");
    const withdrawBtn = document.querySelector(".withdraw-option");
    const closeBtn = document.querySelector(".close-option");
    const reopenBtn = document.querySelector(".reopen-option");

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
    if (currentAccount.status !== "Active") {
        alert("Cannot perform deposit on inactive account");
        return;
    }

    currentTransactionType = "deposit";
    document.getElementById("formTitle").textContent = "Deposit";
    document.getElementById("formAccountNumber").textContent =
        currentAccount.number;
    document.getElementById("confirmBtnText").textContent = "Confirm Deposit";
    document.getElementById("transactionAmount").placeholder = "₱10,000.0";
    document.getElementById("transactionAmount").value = "";

    const transactionForm = document.getElementById("transactionForm");
    transactionForm.style.display = "block";

    // Reset animation
    transactionForm.style.animation = "none";
    transactionForm.offsetHeight; // Trigger reflow
    transactionForm.style.animation = "slideIn 0.5s ease forwards";

    hideAccountActions();
}

// Show withdraw form
function showWithdrawForm() {
    if (currentAccount.status !== "Active") {
        alert("Cannot perform withdrawal on inactive account");
        return;
    }

    currentTransactionType = "withdraw";
    document.getElementById("formTitle").textContent = "Withdraw";
    document.getElementById("formAccountNumber").textContent =
        currentAccount.number;
    document.getElementById("confirmBtnText").textContent =
        "Confirm Withdrawal";
    document.getElementById("transactionAmount").placeholder = "₱10,000.0";
    document.getElementById("transactionAmount").value = "";

    const transactionForm = document.getElementById("transactionForm");
    transactionForm.style.display = "block";

    // Reset animation
    transactionForm.style.animation = "none";
    transactionForm.offsetHeight; // Trigger reflow
    transactionForm.style.animation = "slideIn 0.5s ease forwards";

    hideAccountActions();
}

// Close account
function closeAccount() {
    if (currentAccount.status !== "Active") {
        alert("Account is already inactive");
        return;
    }

    if (
        confirm(
            `Are you sure you want to close account ${currentAccount.number}?`
        )
    ) {
        currentAccount.status = "Closed";
        accountDatabase[currentAccount.number] = currentAccount;
        displayAccountDetails(currentAccount);
        hideAccountActions();

        // Show success message
        alert(`Account ${currentAccount.number} has been closed successfully`);
    }
}

// Reopen account
function reopenAccount() {
    if (currentAccount.status === "Active") {
        alert("Account is already active");
        return;
    }

    if (
        confirm(
            `Are you sure you want to reopen account ${currentAccount.number}?`
        )
    ) {
        currentAccount.status = "Active";
        accountDatabase[currentAccount.number] = currentAccount;
        displayAccountDetails(currentAccount);
        hideAccountActions();

        // Show success message
        alert(
            `Account ${currentAccount.number} has been reopened successfully`
        );
    }
}

// Hide transaction form
function hideTransactionForm() {
    document.getElementById("transactionForm").style.display = "none";
    if (currentAccount) {
        showAccountActions();
    }
}

// Confirm transaction
function confirmTransaction() {
    const amount = parseFloat(
        document.getElementById("transactionAmount").value
    );

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    if (
        currentTransactionType === "withdraw" &&
        amount > currentAccount.balance
    ) {
        alert("Insufficient funds");
        return;
    }

    // Update account balance
    if (currentTransactionType === "deposit") {
        currentAccount.balance += amount;
    } else {
        currentAccount.balance -= amount;
    }

    // Update database
    accountDatabase[currentAccount.number] = currentAccount;

    // Update display
    displayAccountDetails(currentAccount);

    // Show success modal
    showSuccessModal(amount);

    // Hide transaction form
    hideTransactionForm();
}

// Show success modal
function showSuccessModal(amount) {
    const successTitle = document.getElementById("successTitle");
    const successMessage = document.getElementById("successMessage");

    const actionText =
        currentTransactionType === "deposit"
            ? "deposited to"
            : "withdrawn from";
    const amountFormatted = `₱${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
    })}`;

    successTitle.textContent = `${
        currentTransactionType.charAt(0).toUpperCase() +
        currentTransactionType.slice(1)
    } Successful`;
    successMessage.textContent = `${amountFormatted} has been ${actionText} account ${currentAccount.number}`;

    const successModal = document.getElementById("successModal");
    successModal.style.display = "flex";

    // Reset animation
    successModal.style.animation = "none";
    successModal.offsetHeight; // Trigger reflow
    successModal.style.animation = "fadeIn 0.3s ease forwards";
}

// Hide success modal
function hideSuccessModal() {
    document.getElementById("successModal").style.display = "none";
    if (currentAccount) {
        showAccountActions();
    }
}

// Add to search history
function addToSearchHistory(name, accountNumber) {
    // This function would typically add to a database or local storage
    // For this demo, we'll just update the display if needed
    console.log(`Added to history: ${name} - ${accountNumber}`);
}

// Select from history
function selectFromHistory(name, accountNumber) {
    document.getElementById("searchInput").value = accountNumber;
    searchAccount();
}

// Close dropdown when clicking outside
document.addEventListener("click", function (event) {
    const accountDetails = document.getElementById("accountDetails");
    const dropdown = document.getElementById("accountActionsDropdown");

    if (
        isDropdownOpen &&
        !accountDetails.contains(event.target) &&
        !dropdown.contains(event.target)
    ) {
        hideAccountActions();
    }
});

// Initialize the page
function initializePage() {
    // Clear any existing data
    hideAccountDetails();
    hideAccountActions();
    document.getElementById("transactionForm").style.display = "none";
    document.getElementById("successModal").style.display = "none";

    // Focus on search input
    document.getElementById("searchInput").focus();
}

// Call initialization when page loads
window.onload = initializePage;

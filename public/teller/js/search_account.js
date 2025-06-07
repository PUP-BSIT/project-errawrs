// Configuration - API base URL
const API_BASE_URL = '../api';

// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "./bank_teller_login.html";
}

// Elements
const searchInput = document.getElementById("search_input");
const accountCard = document.getElementById("account_card");
const accountActionsDropdown = document.getElementById(
    "account_actions_dropdown"
);
const searchHistoryContainer = document.getElementById("search_history");
const historyBody = document.getElementById("history_body");

// Initialize search history
let searchHistory = [];

// Load search history
async function loadSearchHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/teller/get_search_history.php?teller_number=${encodeURIComponent(tellerInfo.teller_number)}`);
        const data = await response.json();

        if (data.success && data.history) {
            searchHistory = data.history;
            // Don't automatically update UI here
        }
    } catch (error) {
        console.error("Error loading search history:", error);
        showNotification("Error loading search history", true);
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(amount);
}

// Show notification
function showNotification(message, isError = false) {
    const container = document.getElementById("notification_container");
    const notification = document.createElement("div");
    notification.className = `notification ${isError ? "error" : "success"}`;
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
    const accountContainer = document.querySelector(".account-container");
    accountContainer.innerHTML = "";

    // Hide search history when showing a single account
    if (accounts.length === 1) {
        searchHistoryContainer.classList.add("hidden");
        searchHistoryContainer.style.display = "none";
        accountContainer.classList.add("single-card");
    } else {
        accountContainer.classList.remove("single-card");
        // Only show search history if we have entries
        if (searchHistory.length > 0) {
            searchHistoryContainer.classList.remove("hidden");
            searchHistoryContainer.style.display = "block";
        }
    }

    accounts.forEach((account) => {
        // Create a new card wrapper
        const cardWrapper = document.createElement("div");
        cardWrapper.className = "card-wrapper";

        const newCard = document.createElement("div");
        newCard.className = "account-card visible";

        // Format the balance properly with peso sign
        const balance = parseFloat(account.balance.toString().replace(/[^0-9.-]+/g, ""));

        // Determine account type display
        const accountType = account.account_type ? account.account_type.toLowerCase() : 'savings';
        const displayAccountType = accountType === 'credit' ? 'Credit' : 'Savings';

        // Status indicator HTML
        const statusIndicator = account.status === "active"
            ? `<div class="status-indicator active">
                 <div class="status-icon"></div>
                 active
               </div>`
            : `<div class="status-indicator closed">
                 <div class="status-icon"></div>
                 closed
               </div>`;

        newCard.innerHTML = `
            <div class="account-info">
                ${statusIndicator}
                
                <div class="account-field">
                    <div class="account-label">Account No.</div>
                    <div class="account-value account-number">${account.account_number}</div>
                </div>
                
                <div class="account-field">
                    <div class="account-label">Account Name</div>
                    <div class="account-value">${account.user.name}</div>
                </div>
                
                <div class="account-field">
                    <div class="account-label">Balance</div>
                    <div class="account-value balance">${formatCurrency(balance)}</div>
                </div>
                
                <div class="account-field">
                    <div class="account-label">Type</div>
                    <div class="account-type-badge ${accountType}">
                        ${displayAccountType}
                    </div>
                </div>
            </div>
            <div class="more-options">
                <i class="fas fa-chevron-right"></i>
            </div>
            <div class="card-actions">
                ${account.status === "active" ? `
                    <button class="card-action-btn deposit">
                        <i class="fas fa-plus"></i>
                        Deposit
                    </button>
                    <button class="card-action-btn withdraw">
                        <i class="fas fa-minus"></i>
                        Withdraw
                    </button>
                    <button class="card-action-btn close">
                        <i class="fas fa-times"></i>
                        Close Account
                    </button>
                ` : `
                    <button class="card-action-btn reopen">
                        <i class="fas fa-redo"></i>
                        Reopen Account
                    </button>
                `}
            </div>
        `;

        // Add click event for the entire card and more options icon
        const moreOptions = newCard.querySelector('.more-options');
        const cardActions = newCard.querySelector('.card-actions');
        
        function toggleMenu(e) {
            if (!e.target.closest('.card-action-btn')) {
                const chevron = moreOptions.querySelector('.fa-chevron-right');
                chevron.style.transform = chevron.style.transform === 'rotate(90deg)' ? 'rotate(0deg)' : 'rotate(90deg)';
                cardActions.classList.toggle('visible');
            }
        }

        // Add click handlers to both card and more options
        newCard.addEventListener('click', toggleMenu);
        moreOptions.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent double-triggering
            toggleMenu(e);
        });

        // Close actions menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!newCard.contains(e.target)) {
                cardActions.classList.remove('visible');
                const chevron = moreOptions.querySelector('.fa-chevron-right');
                chevron.style.transform = 'rotate(0deg)';
            }
        });

        // Add event listeners to action buttons
        const actionButtons = cardActions.getElementsByClassName('card-action-btn');
        Array.from(actionButtons).forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                cardActions.classList.remove('visible');
                const chevron = moreOptions.querySelector('.fa-chevron-right');
                chevron.style.transform = 'rotate(0deg)';
                
                if (button.classList.contains('deposit')) {
                    sessionStorage.setItem("currentAccount", JSON.stringify({...account, balance: balance}));
                    showDepositForm();
                } else if (button.classList.contains('withdraw')) {
                    sessionStorage.setItem("currentAccount", JSON.stringify({...account, balance: balance}));
                    showWithdrawForm();
                } else if (button.classList.contains('close')) {
                    sessionStorage.setItem("currentAccount", JSON.stringify({...account, balance: balance}));
                    closeAccount();
                } else if (button.classList.contains('reopen')) {
                    sessionStorage.setItem("currentAccount", JSON.stringify({...account, balance: balance}));
                    reopenAccount();
                }
            });
        });

        // Add card to wrapper, then add wrapper to container
        cardWrapper.appendChild(newCard);
        accountContainer.appendChild(cardWrapper);
    });

    // Only load search history if not showing a single account
    if (accounts.length !== 1) {
        loadSearchHistory();
    }
}

// Toggle account actions
function toggleAccountActions() {
    const accountCard = document.getElementById("account_card");
    const accountActions = document.getElementById("account_actions");
    const toggleIcon = document.querySelector(".toggle-icon");

    accountCard.classList.toggle("expanded");
    accountActions.classList.toggle("visible");
    toggleIcon.classList.toggle("active");
}

// Handle action button clicks
function showDepositForm() {
    window.location.href = "./bank_teller_deposit.html";
}

function showWithdrawForm() {
    window.location.href = "./bank_teller_withdraw.html";
}

// Add to search history
function addToSearchHistory(account) {
    // Check if the account already exists in search history
    const existingIndex = searchHistory.findIndex(
        (item) => item.account_number === account.account_number
    );

    // Create new history entry
    const newEntry = {
        account_name: account.user.name,
        account_number: account.account_number,
        balance: account.balance,
        account_type: account.account_type || 'savings',
        status: account.status
    };

    if (existingIndex !== -1) {
        // Remove the existing entry
        searchHistory.splice(existingIndex, 1);
    }

    // Add to the beginning of the array
    searchHistory.unshift(newEntry);

    // Keep only the last 10 entries
    if (searchHistory.length > 10) {
        searchHistory.pop();
    }

    // Update the UI immediately
    updateSearchHistory();
}

// Update search history UI
function updateSearchHistory() {
    historyBody.innerHTML = "";
    
    if (searchHistory.length === 0) {
        searchHistoryContainer.classList.add("hidden");
        return;
    }

    searchHistory.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "history-row";
        row.onclick = () => selectFromHistory(item.account_number);

        const balance = parseFloat(item.balance.toString().replace(/[^0-9.-]+/g, ""));
        const accountType = item.account_type ? item.account_type.toLowerCase() : 'savings';
        const displayAccountType = accountType === 'credit' ? 'Credit' : 'Savings';

        row.innerHTML = `
            <div class="history-value">${index + 1}</div>
            <div class="history-value">${item.account_name}</div>
            <div class="history-value">${item.account_number}</div>
            <div class="history-value balance">${formatCurrency(balance)}</div>
            <div class="history-value type ${accountType}">${displayAccountType}</div>
        `;
        historyBody.appendChild(row);
    });

    // Show search history container if we have entries and not showing a single account
    const accountContainer = document.querySelector(".account-container");
    const hasAccounts = accountContainer.children.length > 0;
    
    if (!hasAccounts || accountContainer.children.length > 1) {
        searchHistoryContainer.classList.remove("hidden");
        searchHistoryContainer.style.display = "block";
    }
}

// Search account - now runs instantly without delay
async function searchAccount() {
    const searchTerm = searchInput.value.trim();
    const contentArea = document.querySelector(".content-area");

    // Always hide search history when searching
    searchHistoryContainer.classList.add("hidden");
    searchHistoryContainer.style.display = "none";

    // Clear account container when search is empty
    if (!searchTerm) {
        const accountContainer = document.querySelector(".account-container");
        accountContainer.innerHTML = "";
        // Show search history when search is empty
        if (searchHistory.length > 0) {
            searchHistoryContainer.classList.remove("hidden");
            searchHistoryContainer.style.display = "block";
        }
        hideLoadingIndicator();
        // Remove scrollbar when no search
        contentArea.classList.remove("has-search-results");
        return;
    }

    // Show loading indicator immediately
    showLoadingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/teller/search_account.php?search=${encodeURIComponent(searchTerm)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`);
        const data = await response.json();

        // Hide loading indicator
        hideLoadingIndicator();

        if (!response.ok) {
            throw new Error(data.error || "Failed to search account");
        }

        if (data.success && data.accounts && data.accounts.length > 0) {
            // Filter accounts that match the search term
            const matchingAccounts = data.accounts.filter((account) =>
                account.account_number.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (matchingAccounts.length > 0) {
                // Add each matching account to search history
                matchingAccounts.forEach(account => {
                    addToSearchHistory(account);
                });
                
                // Keep search history hidden and show results
                searchHistoryContainer.classList.add("hidden");
                searchHistoryContainer.style.display = "none";
                
                // Show scrollbar when we have search results
                contentArea.classList.add("has-search-results");
                // Update UI with matching accounts
                updateAccountDetails(matchingAccounts);
            } else {
                const accountContainer = document.querySelector(".account-container");
                accountContainer.innerHTML = "";
                showNotification("No matching accounts found", true);
                // Show search history when no matches found
                if (searchHistory.length > 0) {
                    searchHistoryContainer.classList.remove("hidden");
                    searchHistoryContainer.style.display = "block";
                }
                // Remove scrollbar when no results
                contentArea.classList.remove("has-search-results");
            }
        } else {
            const accountContainer = document.querySelector(".account-container");
            accountContainer.innerHTML = "";
            showNotification("No accounts found", true);
            // Show search history when no accounts found
            if (searchHistory.length > 0) {
                searchHistoryContainer.classList.remove("hidden");
                searchHistoryContainer.style.display = "block";
            }
            // Remove scrollbar when no results
            contentArea.classList.remove("has-search-results");
        }
    } catch (error) {
        console.error("Search error:", error);
        hideLoadingIndicator();
        showNotification(error.message || "Error searching for account", true);
        const accountContainer = document.querySelector(".account-container");
        accountContainer.innerHTML = "";
        // Show search history on error
        if (searchHistory.length > 0) {
            searchHistoryContainer.classList.remove("hidden");
            searchHistoryContainer.style.display = "block";
        }
        // Remove scrollbar on error
        contentArea.classList.remove("has-search-results");
    }
}

// Show loading indicator
function showLoadingIndicator() {
    // Create loading indicator if it doesn't exist
    let loadingIndicator = document.getElementById("loading_indicator");
    if (!loadingIndicator) {
        loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loading_indicator";
        loadingIndicator.innerHTML = '<div class="spinner"></div><span>Searching...</span>';
        
        // Add to search input container
        const searchContainer = searchInput.parentElement;
        searchContainer.appendChild(loadingIndicator);
    }

    loadingIndicator.style.display = "flex";
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById("loading_indicator");
    if (loadingIndicator) {
        loadingIndicator.style.display = "none";
    }
}

// Select from history
function selectFromHistory(accountNumber) {
    searchInput.value = accountNumber;
    searchAccount();
}

// Show transaction form
function showTransactionForm(type) {
    const transactionModal = document.getElementById("transaction_form");
    const container = transactionModal.querySelector(".transaction-container");
    const account = JSON.parse(sessionStorage.getItem("currentAccount"));

    container.innerHTML = `
        <div class="transaction-header">
            <h2>${type.charAt(0).toUpperCase() + type.slice(1)}</h2>
            <p>Current Balance: ${formatCurrency(account.balance)}</p>
        </div>
        <div class="form-group">
            <label for="${type}_amount">Amount</label>
            <input type="number" 
                   id="${type}_amount" 
                   placeholder="Enter amount" 
                   step="0.01" 
                   min="0"
                   ${type === "withdraw" ? `max="${account.balance}"` : ""}>
        </div>
        <div class="form-actions">
            <button class="form-btn cancel-btn" onclick="hideTransactionForm()">Cancel</button>
            <button class="form-btn confirm-btn" onclick="processTransaction('${type}')">Confirm</button>
        </div>
    `;

    transactionModal.style.display = "flex";
    document.getElementById(`${type}_amount`).focus();
}

// Hide transaction form
function hideTransactionForm() {
    const transactionModal = document.getElementById("transaction_form");
    transactionModal.style.display = "none";
}

// Process transaction
async function processTransaction(type) {
    const amount = parseFloat(document.getElementById(`${type}_amount`).value);
    if (isNaN(amount) || amount <= 0) {
        showNotification("Please enter a valid amount", true);
        return;
    }

    const account = JSON.parse(sessionStorage.getItem("currentAccount"));
    if (!account) {
        showNotification("No account selected", true);
        return;
    }

    showLoadingOverlay(`Processing ${type}...`);

    try {
        const response = await fetch(`${API_BASE_URL}/teller/${type}.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                account_number: account.account_number,
                amount: amount,
                teller_number: tellerInfo.teller_number,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to process ${type}`);
        }

        hideLoadingOverlay();
        hideTransactionForm();
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} successful`);
        
        // Update the account balance in the UI
        await updateAccountBalance(account.account_number);
    } catch (error) {
        hideLoadingOverlay();
        console.error(`Error processing ${type}:`, error);
        showNotification(error.message || `Error processing ${type}`, true);
    }
}

// Show loading overlay
function showLoadingOverlay(message) {
    let overlay = document.getElementById("loading_overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "loading_overlay";
        overlay.innerHTML = `
            <div class="overlay-content">
                <div class="spinner"></div>
                <div class="overlay-message"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.querySelector(".overlay-message").textContent = message;
    overlay.classList.add("loading-overlay-visible");
}

// Hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById("loading_overlay");
    if (overlay) {
        overlay.classList.remove("loading-overlay-visible");
    }
}

// Close account
async function closeAccount() {
    const account = JSON.parse(sessionStorage.getItem("currentAccount"));
    if (!account) {
        showNotification("No account selected", true);
        return;
    }

    if (!confirm("Are you sure you want to close this account?")) {
        return;
    }

    showLoadingOverlay("Closing account...");

    try {
        const response = await fetch(`${API_BASE_URL}/teller/close_account.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                account_number: account.account_number,
                teller_number: tellerInfo.teller_number,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to close account");
        }

        hideLoadingOverlay();
        showNotification("Account closed successfully");
        
        // Refresh the account details
        await searchAccount();
    } catch (error) {
        hideLoadingOverlay();
        console.error("Error closing account:", error);
        showNotification(error.message || "Error closing account", true);
    }
}

// Reopen account
async function reopenAccount() {
    const account = JSON.parse(sessionStorage.getItem("currentAccount"));
    if (!account) {
        showNotification("No account selected", true);
        return;
    }

    if (!confirm("Are you sure you want to reopen this account?")) {
        return;
    }

    showLoadingOverlay("Reopening account...");

    try {
        const response = await fetch(`${API_BASE_URL}/teller/reopen_account.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                account_number: account.account_number,
                teller_number: tellerInfo.teller_number,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to reopen account");
        }

        hideLoadingOverlay();
        showNotification("Account reopened successfully");
        
        // Refresh the account details
        await searchAccount();
    } catch (error) {
        hideLoadingOverlay();
        console.error("Error reopening account:", error);
        showNotification(error.message || "Error reopening account", true);
    }
}

// Update account balance function
async function updateAccountBalance(accountNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/teller/get_account_balance.php?account_number=${encodeURIComponent(accountNumber)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to get account balance");
        }

        if (data.success && data.balance !== undefined) {
            const account = JSON.parse(sessionStorage.getItem("currentAccount"));
            if (account && account.account_number === accountNumber) {
                account.balance = data.balance;
                sessionStorage.setItem("currentAccount", JSON.stringify(account));
            }
            
            // Update the balance in the UI
            const balanceElement = document.querySelector(`.account-card[data-account="${accountNumber}"] .balance`);
            if (balanceElement) {
                balanceElement.textContent = formatCurrency(data.balance);
            }
        }
    } catch (error) {
        console.error("Error updating account balance:", error);
        showNotification("Error updating account balance", true);
    }
}

// Event listener for storage changes
window.addEventListener("storage", (e) => {
    if (e.key === "currentAccount") {
        const account = JSON.parse(e.newValue);
        if (account) {
            updateAccountBalance(account.account_number);
        }
    }
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    const contentArea = document.querySelector(".content-area");
    
    // Update user profile
    if (tellerInfo) {
        const userNameElement = document.querySelector(".user-name");
        const initialsElement = document.querySelector(".initials");
        if (userNameElement) {
            userNameElement.textContent = tellerInfo.name;
        }
        if (initialsElement && tellerInfo.name) {
            const names = tellerInfo.name.split(' ');
            const initials = names.length > 1 
                ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
                : names[0][0].toUpperCase();
            initialsElement.textContent = initials;
        }
    }
    
    // Load search history initially
    loadSearchHistory().then(() => {
        // Only show search history if we have entries and no search term
        if (searchHistory.length > 0 && !searchInput.value.trim()) {
            updateSearchHistory();
        }
    });

    // Add search input event listeners
    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.trim();
        
        // Always hide search history when typing
        searchHistoryContainer.classList.add("hidden");
        searchHistoryContainer.style.display = "none";

        if (!searchTerm) {
            // Clear account container when empty
            const accountContainer = document.querySelector(".account-container");
            accountContainer.innerHTML = "";
            // Show search history when search is cleared
            if (searchHistory.length > 0) {
                searchHistoryContainer.classList.remove("hidden");
                searchHistoryContainer.style.display = "block";
            }
            hideLoadingIndicator();
            contentArea.classList.remove("has-search-results");
        } else {
            searchAccount();
        }
    });

    // Add keyup event listener for Enter key
    searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            searchAccount();
        }
    });

    // Close account actions when clicking outside
    document.addEventListener("click", (e) => {
        const cardWrappers = document.querySelectorAll(".card-wrapper");
        cardWrappers.forEach((wrapper) => {
            const card = wrapper.querySelector(".account-card");
            const actions = wrapper.querySelector(".card-actions");
            if (!card.contains(e.target) && !actions.contains(e.target)) {
                actions.classList.remove("visible");
            }
        });
    });
});


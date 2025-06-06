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

// Initialize search history from localStorage
let searchHistory =
    JSON.parse(
        localStorage.getItem(`searchHistory_${tellerInfo.teller_number}`)
    ) || [];

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

    // Always ensure search history is hidden when showing account details
    searchHistoryContainer.classList.add("hidden");
    searchHistoryContainer.style.display = "none";

    accounts.forEach((account) => {
        // Create a new card wrapper
        const cardWrapper = document.createElement("div");
        cardWrapper.className = "card-wrapper";

        const newCard = document.createElement("div");
        newCard.className = "account-card visible";

        // Format the balance properly with peso sign
        const balance = parseFloat(account.balance.toString().replace(/[^0-9.-]+/g, ""));

        newCard.innerHTML = `
            <div class="account-info">
                <div class="account-label">Account Number</div>
                <div class="account-value">${account.account_number}</div>
                
                <div class="account-label">Account Holder Name</div>
                <div class="account-value">${account.user.name}</div>
                
                <div class="account-label">Account Type</div>
                <div class="account-value">Checking</div>
                
                <div class="account-label">Current Balance</div>
                <div class="account-value">${formatCurrency(balance)}</div>
                
                <div class="account-label">Account Status</div>
                <div class="account-value ${account.status === "active" ? "active" : "closed"}">
                    ${account.status === "active" ? "Active" : "Closed"}
                </div>
            </div>
            <div class="toggle-icon">
                <i class="fas fa-chevron-right"></i>
            </div>
        `;

        // Create actions container for this card
        const actionsContainer = document.createElement("div");
        actionsContainer.className = account.status === "active" 
            ? "account-actions"
            : "account-actions account-actions-center";
        actionsContainer.innerHTML = account.status === "active" 
            ? `
                <button class="action-btn deposit">
                    <i class="fas fa-plus"></i> Deposit
                </button>
                <button class="action-btn withdraw">
                    <i class="fas fa-minus"></i> Withdraw
                </button>
                <button class="action-btn close">
                    <i class="fas fa-times"></i> Close Account
                </button>
            `
            : `
                <button class="action-btn reopen">
                    <i class="fas fa-redo"></i> Reopen Account
                </button>
            `;

        // Add event listeners to buttons
        const buttons = actionsContainer.getElementsByTagName("button");
        Array.from(buttons).forEach((button) => {
            if (button.classList.contains("deposit")) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem("currentAccount", JSON.stringify({...account, balance: balance}));
                    showDepositForm();
                };
            } else if (button.classList.contains("withdraw")) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem("currentAccount", JSON.stringify({...account, balance: balance}));
                    showWithdrawForm();
                };
            } else if (button.classList.contains("close")) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem("currentAccount", JSON.stringify({...account, balance: balance}));
                    closeAccount();
                };
            } else if (button.classList.contains("reopen")) {
                button.onclick = (e) => {
                    e.stopPropagation();
                    sessionStorage.setItem("currentAccount", JSON.stringify({...account, balance: balance}));
                    reopenAccount();
                };
            }
        });

        // Add click event to toggle actions
        newCard.addEventListener("click", (e) => {
            e.stopPropagation();
            actionsContainer.classList.toggle("visible");
            const icon = newCard.querySelector(".toggle-icon i");
            icon.classList.toggle("fa-chevron-right");
            icon.classList.toggle("fa-chevron-left");
        });

        // Add card and actions to wrapper, then add wrapper to container
        cardWrapper.appendChild(newCard);
        cardWrapper.appendChild(actionsContainer);
        accountContainer.appendChild(cardWrapper);
    });

    // Add to search history if there's exactly one account
    if (accounts.length === 1) {
        addToSearchHistory(accounts[0]);
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
        (item) => item.accountNumber === account.account_number
    );

    // Create new history entry
    const newEntry = {
        name: account.user.name,
        accountNumber: account.account_number,
        balance: account.balance,
        status: account.status,
        timestamp: new Date().toISOString()
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

    // Save to localStorage with teller-specific key
    localStorage.setItem(
        `searchHistory_${tellerInfo.teller_number}`,
        JSON.stringify(searchHistory)
    );

    // Don't update history UI while searching
    // updateSearchHistory();
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
        row.onclick = () => selectFromHistory(item.accountNumber);

        const balance = parseFloat(item.balance.toString().replace(/[^0-9.-]+/g, ""));

        row.innerHTML = `
            <div class="history-value">${index + 1}</div>
            <div class="history-value">${item.name}</div>
            <div class="history-value">${item.accountNumber}</div>
            <div class="history-value">${formatCurrency(balance)}</div>
            <div class="history-value status ${item.status === "active" ? "active" : "closed"}">
                ${item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </div>
        `;
        historyBody.appendChild(row);
    });

    // Show search history container if we have entries
    searchHistoryContainer.classList.remove("hidden");
    searchHistoryContainer.style.display = "block";
}

// Search account - now runs instantly without delay
async function searchAccount() {
    const searchTerm = searchInput.value.trim();
    const contentArea = document.querySelector(".content-area");

    // Always ensure search history is hidden when searching
    searchHistoryContainer.classList.add("hidden");
    searchHistoryContainer.style.display = "none";

    // Clear account container when search is empty
    if (!searchTerm) {
        const accountContainer = document.querySelector(".account-container");
        accountContainer.innerHTML = "";
        // Only show search history when search is empty
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
        const response = await fetch(
            `/project-errawrs/src/api/teller/search_account.php?search=${encodeURIComponent(
                searchTerm
            )}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`
        );
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
                // Remove scrollbar when no results
                contentArea.classList.remove("has-search-results");
            }
        } else {
            const accountContainer = document.querySelector(".account-container");
            accountContainer.innerHTML = "";
            showNotification("No accounts found", true);
            // Remove scrollbar when no results
            contentArea.classList.remove("has-search-results");
        }
    } catch (error) {
        console.error("Search error:", error);
        hideLoadingIndicator();
        showNotification(error.message || "Error searching for account", true);
        const accountContainer = document.querySelector(".account-container");
        accountContainer.innerHTML = "";
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
            <label for="transaction_amount">Amount</label>
            <input type="number" 
                   id="transaction_amount" 
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
    document.getElementById("transaction_amount").focus();
}

// Hide transaction form
function hideTransactionForm() {
    const transactionModal = document.getElementById("transaction_form");
    transactionModal.style.display = "none";
}

// Process transaction
async function processTransaction(type) {
    const amount = parseFloat(
        document.getElementById("transaction_amount").value
    );
    const account = JSON.parse(sessionStorage.getItem("currentAccount"));

    if (isNaN(amount) || amount <= 0) {
        showNotification("Please enter a valid amount", true);
        return;
    }

    if (type === "withdraw" && amount > account.balance) {
        showNotification("Insufficient balance", true);
        return;
    }

    try {
        const response = await fetch(
            `/project-errawrs/src/api/teller/${type}.php`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    account_number: account.account_number,
                    amount: amount,
                    teller_number: tellerInfo.teller_number,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to ${type}`);
        }

        account.balance = data.new_balance;
        sessionStorage.setItem("currentAccount", JSON.stringify(account));
        updateAccountDetails([account]);

        hideTransactionForm();
        showNotification(
            `${type.charAt(0).toUpperCase() + type.slice(1)} successful`
        );
    } catch (error) {
        console.error(`${type} error:`, error);
        showNotification(error.message, true);
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

    // Check if account has balance
    const balance = parseFloat(account.balance.toString().replace(/[^0-9.-]+/g, ""));
    if (balance > 0) {
        showNotification("Account must have zero balance before closing", true);
        return;
    }

    // Show loading overlay with green spinner
    showLoadingOverlay("Closing account...");

    try {
        const response = await fetch(`/project-errawrs/src/api/teller/close_account.php`, {
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

        // Update account status in memory
        account.status = "closed";
        sessionStorage.setItem("currentAccount", JSON.stringify(account));

        // Update search history with new status
        const historyIndex = searchHistory.findIndex(
            (item) => item.accountNumber === account.account_number
        );
        if (historyIndex !== -1) {
            searchHistory[historyIndex].status = "closed";
            localStorage.setItem(
                `searchHistory_${tellerInfo.teller_number}`,
                JSON.stringify(searchHistory)
            );
        }

        // Update UI
        updateAccountDetails([account]);
        showNotification("Account closed successfully");
    } catch (error) {
        console.error("Close account error:", error);
        showNotification(error.message, true);
    } finally {
        hideLoadingOverlay();
    }
}

// Reopen account
async function reopenAccount() {
    const account = JSON.parse(sessionStorage.getItem("currentAccount"));
    if (!account) {
        showNotification("No account selected", true);
        return;
    }

    // Show loading overlay with green spinner
    showLoadingOverlay("Reopening account...");

    try {
        const response = await fetch(`/project-errawrs/src/api/teller/reopen_account.php`, {
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

        // Update account status in memory
        account.status = "active";
        sessionStorage.setItem("currentAccount", JSON.stringify(account));

        // Update search history with new status
        const historyIndex = searchHistory.findIndex(
            (item) => item.accountNumber === account.account_number
        );
        if (historyIndex !== -1) {
            searchHistory[historyIndex].status = "active";
            localStorage.setItem(
                `searchHistory_${tellerInfo.teller_number}`,
                JSON.stringify(searchHistory)
            );
        }

        // Update UI
        updateAccountDetails([account]);
        showNotification("Account reopened successfully");
    } catch (error) {
        console.error("Reopen account error:", error);
        showNotification(error.message, true);
    } finally {
        hideLoadingOverlay();
    }
}

// Function to update account balance and refresh account card
async function updateAccountBalance() {
    try {
        // Get the current account number
        const currentAccount = JSON.parse(
            sessionStorage.getItem("currentAccount")
        );
        if (!currentAccount || !currentAccount.account_number) return;

        // Fetch fresh account data
        const response = await fetch(
            `/project-errawrs/src/api/teller/search_account.php?search=${encodeURIComponent(
                currentAccount.account_number
            )}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`
        );
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to refresh account data");
        }

        if (data.success && data.accounts && data.accounts.length > 0) {
            const account = data.accounts[0];
            updateAccountDetails([account]);

            // Update search history with new balance
            const historyIndex = searchHistory.findIndex(
                (item) => item.accountNumber === account.account_number
            );
            if (historyIndex !== -1) {
                searchHistory[historyIndex].balance = account.balance;
                localStorage.setItem(
                    `searchHistory_${tellerInfo.teller_number}`,
                    JSON.stringify(searchHistory)
                );
            }
        }
    } catch (error) {
        console.error("Error updating account data:", error);
        showNotification("Error refreshing account data", true);
    }
}

// Event listener for storage changes
window.addEventListener("storage", (e) => {
    if (e.key === "currentAccount") {
        const account = JSON.parse(e.newValue);
        if (account) {
            updateAccountBalance();
        }
    }
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    const contentArea = document.querySelector(".content-area");
    
    // Show search history initially if we have entries and no search term
    if (searchHistory.length > 0 && !searchInput.value.trim()) {
        updateSearchHistory();
    }

    // Add search input event listeners
    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            // Clear account container and show search history immediately
            const accountContainer = document.querySelector(".account-container");
            accountContainer.innerHTML = "";
            if (searchHistory.length > 0) {
                searchHistoryContainer.classList.remove("hidden");
                searchHistoryContainer.style.display = "block";
            }
            hideLoadingIndicator();
            // Remove scrollbar when clearing search
            contentArea.classList.remove("has-search-results");
        } else {
            // Hide search history and perform search
            searchHistoryContainer.classList.add("hidden");
            searchHistoryContainer.style.display = "none";
            searchAccount();
        }
    });

    // Add keyup event listener for Enter key
    searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            searchAccount();
        }
    });

    // Update user profile if available
    if (tellerInfo) {
        const userNameElement = document.querySelector(".user-name");
        if (userNameElement) {
            userNameElement.textContent = tellerInfo.name;
        }
    }

    // Close account actions when clicking outside
    document.addEventListener("click", (e) => {
        const cardWrappers = document.querySelectorAll(".card-wrapper");
        cardWrappers.forEach((wrapper) => {
            const card = wrapper.querySelector(".account-card");
            const actions = wrapper.querySelector(".account-actions");
            if (!card.contains(e.target) && !actions.contains(e.target)) {
                actions.classList.remove("visible");
                const icon = card.querySelector(".toggle-icon i");
                icon.classList.remove("fa-chevron-left");
                icon.classList.add("fa-chevron-right");
            }
        });
    });
});

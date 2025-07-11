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

// Elements
const searchInput = document.getElementById("search_input");
const accountCard = document.getElementById("account_card");
const accountActionsDropdown = document.getElementById(
    "account_actions_dropdown"
);
const searchHistoryContainer = document.getElementById("search_history");
const historyBody = document.getElementById("history_body");
const clearBtn = document.getElementById('clear_search_btn');

if (searchInput && clearBtn) {
    searchInput.addEventListener('input', () => {
        if (searchInput.value) {
            clearBtn.classList.remove('clear-search-btn-hidden');
            clearBtn.classList.add('clear-search-btn-visible');
        } else {
            clearBtn.classList.remove('clear-search-btn-visible');
            clearBtn.classList.add('clear-search-btn-hidden');
        }
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.classList.remove('clear-search-btn-visible');
        clearBtn.classList.add('clear-search-btn-hidden');
        updateAccountDetails([]); // Clear results and show history
    });
}

// Initialize search history
let searchHistory = [];

// Load search history
async function loadSearchHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/teller/get_search_history.php?teller_number=${encodeURIComponent(tellerInfo.teller_number)}`, {
            credentials: 'include'
        });
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
    const accountContainer = document.querySelector(".account-container");
    const searchInput = document.getElementById("search_input");
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    accountContainer.innerHTML = "";

    // Only show results if there is a search term
    if (!searchTerm) {
        // Show search history if no search term
        searchHistoryContainer.classList.remove("hidden");
        searchHistoryContainer.classList.add("search-history-visible");
        searchHistoryContainer.classList.remove("search-history-hidden");
        return;
    }

    // Hide search history when showing search results
    searchHistoryContainer.classList.add("hidden");
    searchHistoryContainer.classList.add("search-history-hidden");
    searchHistoryContainer.classList.remove("search-history-visible");

    // Set single card layout if only one account
    if (accounts.length === 1) {
        accountContainer.classList.add("single-card");
    } else {
        accountContainer.classList.remove("single-card");
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
                    <div class="account-type-badge ${accountType}">${displayAccountType}</div>
                </div>
            </div>
            <div class="card-actions always-visible">
                ${account.status === "active" ? `
                    <button class="card-action-btn deposit"><i class="fas fa-plus"></i> Deposit</button>
                    <button class="card-action-btn withdraw"><i class="fas fa-minus"></i> Withdraw</button>
                    <button class="card-action-btn close"><i class="fas fa-times"></i> Close Account</button>
                ` : `
                    <button class="card-action-btn reopen"><i class="fas fa-redo"></i> Reopen Account</button>
                `}
            </div>
        `;
        // Remove chevron/more button logic and event listeners

        // Add event listeners to action buttons
        const actionButtons = newCard.getElementsByClassName('card-action-btn');
        Array.from(actionButtons).forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (button.classList.contains('deposit')) {
                    sessionStorage.setItem("selectedAccount", JSON.stringify({...account, balance: balance}));
                    window.location.href = "./bank_teller_deposit.html";
                } else if (button.classList.contains('withdraw')) {
                    sessionStorage.setItem("selectedAccount", JSON.stringify({...account, balance: balance}));
                    window.location.href = "./bank_teller_withdraw.html";
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

    // Only load search history if not showing any accounts (empty search)
    if (accounts.length === 0) {
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

    // Keep only the last 5 entries (limit to 5 accounts)
    if (searchHistory.length > 5) {
        searchHistory.splice(5);
    }

    // Update the UI immediately
    updateSearchHistory();
}

// Update search history UI
function updateSearchHistory() {
    historyBody.innerHTML = "";
    
    if (searchHistory.length === 0) {
        searchHistoryContainer.classList.add("hidden");
        searchHistoryContainer.style.display = "none";
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

    // Only show search history if we have entries and no search term
    const searchTerm = searchInput.value.trim();
    const accountContainer = document.querySelector(".account-container");
    const hasAccounts = accountContainer.children.length > 0;
    
    if (!searchTerm && !hasAccounts && searchHistory.length > 0) {
        searchHistoryContainer.classList.remove("hidden");
        searchHistoryContainer.style.display = "block";
    } else {
        searchHistoryContainer.classList.add("hidden");
        searchHistoryContainer.style.display = "none";
    }
}

// Search account - now runs instantly without delay
async function searchAccount() {
    const searchTerm = searchInput.value.trim();
    const contentArea = document.querySelector(".content-area");

    // Always hide search history when searching
    searchHistoryContainer.classList.add("hidden");
    searchHistoryContainer.classList.add("search-history-hidden");
    searchHistoryContainer.classList.remove("search-history-visible");

    // Clear account container when search is empty
    if (!searchTerm) {
        const accountContainer = document.querySelector(".account-container");
        accountContainer.innerHTML = "";
        // Show search history when search is empty
        if (searchHistory.length > 0) {
            searchHistoryContainer.classList.remove("hidden");
            searchHistoryContainer.classList.add("search-history-visible");
            searchHistoryContainer.classList.remove("search-history-hidden");
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
            `${API_BASE_URL}/teller/search_account.php?search=${encodeURIComponent(
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
                account.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.user.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (matchingAccounts.length > 0) {
                // Add each matching account to search history
                matchingAccounts.forEach(account => {
                    addToSearchHistory(account);
                });
                
                // Keep search history hidden and show results
                searchHistoryContainer.classList.add("hidden");
                searchHistoryContainer.classList.add("search-history-hidden");
                searchHistoryContainer.classList.remove("search-history-visible");
                
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
                    searchHistoryContainer.classList.add("search-history-visible");
                    searchHistoryContainer.classList.remove("search-history-hidden");
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
                searchHistoryContainer.classList.add("search-history-visible");
                searchHistoryContainer.classList.remove("search-history-hidden");
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
            searchHistoryContainer.classList.add("search-history-visible");
            searchHistoryContainer.classList.remove("search-history-hidden");
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

    loadingIndicator.classList.remove("loading-indicator-hidden");
    loadingIndicator.classList.add("loading-indicator-visible");
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById("loading_indicator");
    if (loadingIndicator) {
        loadingIndicator.classList.remove("loading-indicator-visible");
        loadingIndicator.classList.add("loading-indicator-hidden");
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

    transactionModal.classList.remove("transaction-modal-hidden");
    transactionModal.classList.add("transaction-modal-visible");
    document.getElementById("transaction_amount").focus();
}

// Hide transaction form
function hideTransactionForm() {
    const transactionModal = document.getElementById("transaction_form");
    transactionModal.classList.remove("transaction-modal-visible");
    transactionModal.classList.add("transaction-modal-hidden");
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
            `${API_BASE_URL}/teller/${type}.php`,
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

        // Update account status in memory
        account.status = "closed";
        sessionStorage.setItem("currentAccount", JSON.stringify(account));

        // Update search history with new status
        const historyIndex = searchHistory.findIndex(
            (item) => item.account_number === account.account_number
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

        // Update account status in memory
        account.status = "active";
        sessionStorage.setItem("currentAccount", JSON.stringify(account));

        // Update search history with new status
        const historyIndex = searchHistory.findIndex(
            (item) => item.account_number === account.account_number
        );
        if (historyIndex !== -1) {
            searchHistory[historyIndex].status = "active";
        }

        // Fetch updated account data to refresh the UI
        const searchResponse = await fetch(
            `${API_BASE_URL}/teller/search_account.php?search=${encodeURIComponent(
                account.account_number
            )}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`
        );
        const searchData = await searchResponse.json();

        if (searchData.success && searchData.accounts && searchData.accounts.length > 0) {
            // Update UI with fresh account data
            updateAccountDetails([searchData.accounts[0]]);
            showNotification("Account reopened successfully");
        }
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
            `${API_BASE_URL}/teller/search_account.php?search=${encodeURIComponent(
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
                (item) => item.account_number === account.account_number
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

// Utility to get query param
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    // Update user profile if available
    if (tellerInfo) {
        const userNameElements = document.querySelectorAll(".user-name");
        const avatarElement = document.querySelector(".user-avatar.dynamic-avatar");
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

    const contentArea = document.querySelector(".content-area");
    
    // Load search history initially
    loadSearchHistory().then(() => {
        // Only show search history if we have entries and no search term
        if (searchHistory.length > 0 && !searchInput.value.trim()) {
            updateSearchHistory();
        }
    });

    const accountParam = getQueryParam('account');
    if (accountParam) {
        const searchInput = document.getElementById('search_input');
        const clearBtn = document.getElementById('clear_search_btn');
        if (searchInput) {
            searchInput.value = accountParam;
            if (clearBtn) {
            clearBtn.classList.remove('clear-search-btn-hidden');
            clearBtn.classList.add('clear-search-btn-visible');
        }
            // Trigger the search logic (call the function that runs on input)
            searchAccount();
        }
    }

    // Add search input event listeners
    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.trim();
        
        // Always hide search history when typing
        searchHistoryContainer.classList.add("hidden");
        searchHistoryContainer.classList.add("search-history-hidden");
        searchHistoryContainer.classList.remove("search-history-visible");

        if (!searchTerm) {
            // Clear account container when empty
            const accountContainer = document.querySelector(".account-container");
            accountContainer.innerHTML = "";
            // Show search history when search is cleared
            if (searchHistory.length > 0) {
                searchHistoryContainer.classList.remove("hidden");
                searchHistoryContainer.classList.add("search-history-visible");
                searchHistoryContainer.classList.remove("search-history-hidden");
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
                // No need to remove "visible" class here as it's always visible
            }
        });
    });
});


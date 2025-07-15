// Bank Teller Search Account - Main JavaScript File
// This file handles account search functionality for bank tellers

import { API_ENDPOINTS, ROUTES } from '/api_config.js';

// ============================================================================
// INITIALIZATION AND CONFIGURATION
// ============================================================================

// Check if teller is logged in
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "/login";
}

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const searchInput = document.getElementById("search_input");
const clearBtn = document.getElementById('clear_search_btn');
const accountContainer = document.querySelector(".account-container");
const contentArea = document.querySelector(".content-area");

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Format currency to Philippine Peso
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(amount);
}

// Show notification message
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

// Show loading indicator
function showLoadingIndicator() {
    let loadingIndicator = document.getElementById("loading_indicator");
    if (!loadingIndicator) {
        loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loading_indicator";
        loadingIndicator.innerHTML = '<div class="spinner"></div><span>Searching...</span>';
        searchInput.parentElement.appendChild(loadingIndicator);
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

// Show loading overlay for account operations
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

// Get URL query parameter
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

// === Modal and Overlay Helpers ===
function showConfirmationModal(message, onConfirm) {
    let modal = document.getElementById('confirmation_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmation_modal';
        modal.innerHTML = `
            <div class="overlay-content" style="min-width:320px;text-align:center;">
                <div class="overlay-message" id="confirmation_message"></div>
                <div id="confirmation_actions" style="margin-top:24px;display:flex;gap:16px;justify-content:center;"></div>
            </div>
        `;
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.6)';
        modal.style.zIndex = '10001';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        document.body.appendChild(modal);
    }
    const questionDiv = document.getElementById('confirmation_message');
    questionDiv.textContent = message;
    questionDiv.style.fontSize = '1.25rem';
    questionDiv.style.fontWeight = '700';
    modal.style.display = 'flex';
    const actionsDiv = document.getElementById('confirmation_actions');
    actionsDiv.innerHTML = `
        <button id="confirm_btn" style="padding:14px 32px;border-radius:8px;background:var(--color-mint);color:#fff;border:none;font-weight:600;cursor:pointer;font-size:1.1rem;">Confirm</button>
        <button id="cancel_btn" style="padding:14px 32px;border-radius:8px;background:var(--color-red);color:#fff;border:none;font-weight:600;cursor:pointer;font-size:1.1rem;">Cancel</button>
    `;
    document.getElementById('confirm_btn').onclick = function() {
        // Hide the question, show only spinner and processing
        questionDiv.style.display = 'none';
        actionsDiv.innerHTML = `
            <div style='display:flex;flex-direction:column;align-items:center;justify-content:center;width:160px;padding:24px 0;'>
                <div class='spinner mint-spinner' style='width:40px;height:40px;'></div>
                <div style='margin-top:18px;font-weight:700;font-size:1.5rem;'>Processing...</div>
            </div>
        `;
        onConfirm(() => { modal.style.display = 'none'; questionDiv.style.display = ''; });
    };
    document.getElementById('cancel_btn').onclick = function() {
        modal.style.display = 'none';
        questionDiv.style.display = '';
    };
}

function showSuccessOverlay(message) {
    let overlay = document.getElementById('success_overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'success_overlay';
        overlay.innerHTML = `
            <div class="overlay-content">
                <div class="spinner" style="display:none;"></div>
                <div class="overlay-message" id="success_overlay_message" style="font-weight: 800;"></div>
            </div>
        `;
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.6)';
        overlay.style.zIndex = '10001';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        document.body.appendChild(overlay);
    }
    const msgDiv = document.getElementById('success_overlay_message');
    msgDiv.textContent = message;
    msgDiv.style.fontWeight = '800';
    overlay.style.display = 'flex';
    setTimeout(() => { overlay.style.display = 'none'; }, 1800);
}

// ============================================================================
// ACCOUNT DISPLAY FUNCTIONS
// ============================================================================

// Update account details in the UI
function updateAccountDetails(accounts) {
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    accountContainer.innerHTML = "";

    // Only show results if there is a search term
    if (!searchTerm) {
        return;
    }

    // Set single card layout if only one account
    if (accounts.length === 1) {
        accountContainer.classList.add("single-card");
    } else {
        accountContainer.classList.remove("single-card");
    }

    accounts.forEach((account) => {
        const cardWrapper = document.createElement("div");
        cardWrapper.className = "card-wrapper";

        const newCard = document.createElement("div");
        newCard.className = "account-card visible";

        // Format the balance
        const balance = parseFloat(account.balance.toString().replace(/[^0-9.-]+/g, ""));

        // Determine account type display
        const accountType = account.account_type ? account.account_type.toLowerCase() : 'savings';
        const displayAccountType = accountType === 'credit' ? 'Credit' : 'Savings';

        // Create status indicator
        const statusIndicator = account.status === "active"
            ? '<div class="status-indicator active"><div class="status-icon"></div>active</div>'
            : '<div class="status-indicator closed"><div class="status-icon"></div>closed</div>';

        // Create action buttons based on account status
        const actionButtons = account.status === "active" 
            ? `<button class="card-action-btn deposit"><i class="fas fa-plus"></i> Deposit</button>
               <button class="card-action-btn withdraw"><i class="fas fa-minus"></i> Withdraw</button>
               <button class="card-action-btn close"><i class="fas fa-times"></i> Close Account</button>`
            : `<button class="card-action-btn reopen"><i class="fas fa-redo"></i> Reopen Account</button>`;

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
                ${actionButtons}
            </div>
        `;

        // Add event listeners to action buttons
        const buttons = newCard.getElementsByClassName('card-action-btn');
        Array.from(buttons).forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                handleActionButtonClick(button, account, balance);
            });
        });

        cardWrapper.appendChild(newCard);
        accountContainer.appendChild(cardWrapper);
    });
}

// Handle action button clicks
function handleActionButtonClick(button, account, balance) {
    const accountData = {...account, balance: balance};
    
    if (button.classList.contains('deposit')) {
        sessionStorage.setItem("selectedAccount", JSON.stringify(accountData));
        window.location.href = ROUTES.TELLER_DEPOSIT;
    } else if (button.classList.contains('withdraw')) {
        sessionStorage.setItem("selectedAccount", JSON.stringify(accountData));
        window.location.href = ROUTES.TELLER_WITHDRAW;
    } else if (button.classList.contains('close')) {
        sessionStorage.setItem("currentAccount", JSON.stringify(accountData));
        showConfirmationModal('Are you sure you want to close this account?', (done) => closeAccount(done));
    } else if (button.classList.contains('reopen')) {
        sessionStorage.setItem("currentAccount", JSON.stringify(accountData));
        showConfirmationModal('Are you sure you want to re-open this account?', (done) => reopenAccount(done));
    }
}

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================

// Search for accounts
async function searchAccount() {
    const searchTerm = searchInput.value.trim();

    // Clear results if no search term
    if (!searchTerm) {
        accountContainer.innerHTML = "";
        hideLoadingIndicator();
        contentArea.classList.remove("has-search-results");
        return;
    }

    showLoadingIndicator();

    try {
        const response = await fetch(
            `${API_ENDPOINTS.TELLER_SEARCH_ACCOUNT}?search=${encodeURIComponent(searchTerm)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`
        );
        const data = await response.json();

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
                contentArea.classList.add("has-search-results");
                updateAccountDetails(matchingAccounts);
            } else {
                accountContainer.innerHTML = "";
                showNotification("No matching accounts found", true);
                contentArea.classList.remove("has-search-results");
            }
        } else {
            accountContainer.innerHTML = "";
            showNotification("No accounts found", true);
            contentArea.classList.remove("has-search-results");
        }
    } catch (error) {
        console.error("Search error:", error);
        hideLoadingIndicator();
        showNotification(error.message || "Error searching for account", true);
        accountContainer.innerHTML = "";
        contentArea.classList.remove("has-search-results");
    }
}

// ============================================================================
// ACCOUNT OPERATIONS
// ============================================================================

// Close account
async function closeAccount(done) {
    const account = JSON.parse(sessionStorage.getItem("currentAccount"));
    if (!account) {
        showNotification("No account selected", true);
        if (done) done();
        return;
    }
    const balance = parseFloat(account.balance.toString().replace(/[^0-9.-]+/g, ""));
    if (balance > 0) {
        showNotification("Account must have zero balance before closing", true);
        if (done) done();
        return;
    }
    showLoadingOverlay("Processing...");
    try {
        const response = await fetch(`${API_ENDPOINTS.TELLER_CLOSE_ACCOUNT}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                account_number: account.account_number,
                teller_number: tellerInfo.teller_number,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to close account");
        }
        account.status = "closed";
        sessionStorage.setItem("currentAccount", JSON.stringify(account));
        updateAccountDetails([account]);
        hideLoadingOverlay();
        if (done) done();
        showSuccessOverlay("Account Closed Successfully");
    } catch (error) {
        hideLoadingOverlay();
        if (done) done();
        showNotification(error.message, true);
    }
}

// Reopen account
async function reopenAccount(done) {
    const account = JSON.parse(sessionStorage.getItem("currentAccount"));
    if (!account) {
        showNotification("No account selected", true);
        if (done) done();
        return;
    }
    showLoadingOverlay("Processing...");
    try {
        const response = await fetch(`${API_ENDPOINTS.TELLER_REOPEN_ACCOUNT}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                account_number: account.account_number,
                teller_number: tellerInfo.teller_number,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to reopen account");
        }
        account.status = "active";
        sessionStorage.setItem("currentAccount", JSON.stringify(account));
        const searchResponse = await fetch(
            `${API_ENDPOINTS.TELLER_SEARCH_ACCOUNT}?search=${encodeURIComponent(account.account_number)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`
        );
        const searchData = await searchResponse.json();
        if (searchData.success && searchData.accounts && searchData.accounts.length > 0) {
            updateAccountDetails([searchData.accounts[0]]);
        }
        hideLoadingOverlay();
        if (done) done();
        showSuccessOverlay("Account Re-open Successfully");
    } catch (error) {
        hideLoadingOverlay();
        if (done) done();
        showNotification(error.message, true);
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
    // Update user profile display
    if (tellerInfo) {
        const avatarElement = document.querySelector(".user-avatar.dynamic-avatar");
        let fullName = '';
        
        if (tellerInfo.first_name && tellerInfo.last_name) {
            fullName = `${tellerInfo.first_name} ${tellerInfo.last_name}`;
        } else if (tellerInfo.name) {
            fullName = tellerInfo.name;
        }
        
        // Set avatar initial
        if (avatarElement && fullName) {
            const initial = fullName.trim().charAt(0).toUpperCase();
            avatarElement.textContent = initial;
        }
    }

    // Handle search input changes
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
            updateAccountDetails([]);
        });
    }

    // Instant search on input (no delay)
    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            accountContainer.innerHTML = "";
            hideLoadingIndicator();
            contentArea.classList.remove("has-search-results");
        } else {
            searchAccount();
        }
    });

    // Remove Enter key search (now handled by input event)
    // searchInput.addEventListener("keyup", (e) => {
    //     if (e.key === "Enter") {
    //         searchAccount();
    //     }
    // });

    // Check for account parameter in URL
    const accountParam = getQueryParam('account');
    if (accountParam) {
        searchInput.value = accountParam;
        if (clearBtn) {
            clearBtn.classList.remove('clear-search-btn-hidden');
            clearBtn.classList.add('clear-search-btn-visible');
        }
        searchAccount();
    }
});

// Add mint-spinner CSS if not present
(function(){
    if (!document.getElementById('mint-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'mint-spinner-style';
        style.innerHTML = `.mint-spinner { border-top: 4px solid var(--color-mint) !important; border-width: 4px !important; }`;
        document.head.appendChild(style);
    }
})();


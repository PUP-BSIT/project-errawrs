// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "./bank_teller_login.html";
}

// Keep track of last known values to detect changes
let lastKnownValues = {
    deposits: '0.00',
    withdrawals: '0.00',
    closed_accounts: 0,
    reopened_accounts: 0
};

let searchTimeout = null;

// Update teller name in the UI
document.addEventListener("DOMContentLoaded", () => {
    // Update name in sidebar and welcome section
    const userNameElements = document.querySelectorAll(".user-name");
    const nameTextElement = document.querySelector(".name-text");
    
    if (tellerInfo.name) {
        userNameElements.forEach(el => el.textContent = tellerInfo.name);
        nameTextElement.textContent = tellerInfo.name + "!";
    }

    // Set up search functionality
    setupSearch();

    // Fetch and update dashboard summary
    fetchDashboardSummary();

    // Set up auto-refresh every 5 minutes
    setInterval(fetchDashboardSummary, 5 * 60 * 1000);
});

// Set up search functionality
function setupSearch() {
    const searchInput = document.getElementById('quick_search');
    const searchResults = document.getElementById('search_results');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            // Hide results if search term is empty
            if (searchTerm.length === 0) {
                searchResults.style.display = 'none';
                return;
            }

            // Show loading state
            searchResults.style.display = 'block';
            searchResults.innerHTML = `
                <div class="loading-results">
                    <i class="fas fa-spinner fa-spin"></i>
                    Searching...
                </div>`;

            // Debounce search
            searchTimeout = setTimeout(() => {
                performSearch(searchTerm);
            }, 300);
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
}

// Perform search
async function performSearch(searchTerm) {
    try {
        const response = await fetch(`../../src/api/teller/search_account.php?search=${encodeURIComponent(searchTerm)}&teller_number=${tellerInfo.teller_number}`);
        const data = await response.json();

        const searchResults = document.getElementById('search_results');

        if (!data.success) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    Error: ${data.error || 'Failed to search accounts'}
                </div>`;
            return;
        }

        if (data.accounts.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    No accounts found
                </div>`;
            return;
        }

        // Display results
        const resultsHtml = data.accounts.map(account => `
            <div class="search-result-item" onclick="handleAccountClick('${account.account_number}')">
                <div class="result-name">${account.user.name}</div>
                <div class="result-account">
                    Account: ${account.account_number} | 
                    Balance: ₱${account.balance} | 
                    Status: ${account.status}
                </div>
            </div>
        `).join('');

        searchResults.innerHTML = resultsHtml;
        searchResults.style.display = 'block';

    } catch (error) {
        console.error('Error searching accounts:', error);
        const searchResults = document.getElementById('search_results');
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-circle"></i>
                Error searching accounts
            </div>`;
    }
}

// Handle account click
function handleAccountClick(accountNumber) {
    // Redirect to account details page
    window.location.href = `bank_teller_account_details.html?account=${accountNumber}`;
}

// Handle logout
document.querySelector('.nav-logout a').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Clear session storage
    sessionStorage.removeItem('tellerInfo');
    
    // Redirect to login page
    window.location.href = './bank_teller_login.html';
});

// Format time to 12-hour format with AM/PM
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Fetch dashboard summary data
async function fetchDashboardSummary() {
    try {
        const response = await fetch(`../../src/api/teller/get_dashboard_summary.php?teller_number=${tellerInfo.teller_number}`);
        const data = await response.json();

        if (data.success) {
            updateDashboardSummary(data.summary);
        } else {
            console.error("Failed to fetch dashboard summary:", data.error);
        }
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
    }
}

// Update dashboard summary in the UI
function updateDashboardSummary(summary) {
    const currentTime = formatTime(new Date());

    // Update deposits if changed
    if (summary.deposits.amount !== lastKnownValues.deposits) {
        document.getElementById('total-deposits').textContent = `₱${summary.deposits.amount}`;
        document.getElementById('deposits-updated').textContent = currentTime;
        lastKnownValues.deposits = summary.deposits.amount;
    }

    // Update withdrawals if changed
    if (summary.withdrawals.amount !== lastKnownValues.withdrawals) {
        document.getElementById('total-withdrawals').textContent = `₱${summary.withdrawals.amount}`;
        document.getElementById('withdrawals-updated').textContent = currentTime;
        lastKnownValues.withdrawals = summary.withdrawals.amount;
    }

    // Update closed accounts if changed
    if (summary.closed_accounts.count !== lastKnownValues.closed_accounts) {
        document.getElementById('total-closed').textContent = `${summary.closed_accounts.count} Account${summary.closed_accounts.count !== 1 ? 's' : ''}`;
        document.getElementById('closed-updated').textContent = currentTime;
        lastKnownValues.closed_accounts = summary.closed_accounts.count;
    }

    // Update reopened accounts if changed
    if (summary.reopened_accounts.count !== lastKnownValues.reopened_accounts) {
        document.getElementById('total-reopened').textContent = `${summary.reopened_accounts.count} Account${summary.reopened_accounts.count !== 1 ? 's' : ''}`;
        document.getElementById('reopened-updated').textContent = currentTime;
        lastKnownValues.reopened_accounts = summary.reopened_accounts.count;
    }
}

// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    const tellerInfo = sessionStorage.getItem('tellerInfo');
    if (!tellerInfo) {
        window.location.href = './bank_teller_login.html';
    }
});
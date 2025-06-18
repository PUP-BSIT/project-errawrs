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

// Keep track of last known values to detect changes
let lastKnownValues = {
    deposits: '0.00',
    withdrawals: '0.00',
    closed_accounts: 0,
    reopened_accounts: 0,
    pending_accounts: 0,
    declined_accounts: 0
};

// Show notification function
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification_container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 3000);
}

let searchTimeout = null;

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
    // Update name in sidebar and greeting section
    const userNameElements = document.querySelectorAll(".user-name");
    const nameTextElement = document.querySelector(".name-text");
    
    if (tellerInfo.first_name && tellerInfo.last_name) {
        const fullName = `${tellerInfo.first_name} ${tellerInfo.last_name}`;
        userNameElements.forEach(el => el.textContent = fullName);
        nameTextElement.textContent = fullName + "!";
    } else if (tellerInfo.name) {
        userNameElements.forEach(el => el.textContent = tellerInfo.name);
        nameTextElement.textContent = tellerInfo.name + "!";
    }

    // Set up search functionality
    setupSearch();

    // Fetch and update dashboard summary
    fetchDashboardSummary();

    // Set up auto-refresh every 5 minutes
    setInterval(fetchDashboardSummary, 5 * 60 * 1000);

    // Load recent registrations
    loadRecentRegistrations();
    
    // Refresh registrations every 30 seconds
    setInterval(loadRecentRegistrations, 30000);
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
        const response = await fetch(`${API_BASE_URL}/teller/search_account.php?search=${encodeURIComponent(searchTerm)}&teller_number=${tellerInfo.teller_number}`);
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
            <div class="search-result-item">
                <div class="result-name">${account.user.name}</div>
                <div class="result-account">
                    <div>Account: ${account.account_number}</div>
                    <div>Balance: ₱${account.balance}</div>
                    <div>Status: <span class="status-text ${account.status}">${account.status}</span></div>
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
        const response = await fetch(`${API_BASE_URL}/teller/get_dashboard_summary.php?teller_number=${tellerInfo.teller_number}`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            updateDashboardSummary(data.summary);
        } else {
            console.error("Failed to fetch dashboard summary:", data.error);
            showNotification(data.error || "Failed to fetch dashboard summary", 'error');
        }
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        showNotification("Error fetching dashboard summary", 'error');
    }
}

// Update dashboard summary in the UI
function updateDashboardSummary(summary) {
    const currentTime = formatTime(new Date());

    summary.forEach(item => {
        let elementIdPrefix = '';
        let lastKnownValueKey = '';
        let parseValue = (value) => value; // Default parser, for deposits/withdrawals (string)

        switch (item.title) {
            case 'Total Deposits Today':
                elementIdPrefix = 'deposits';
                lastKnownValueKey = 'deposits';
                break;
            case 'Total Withdrawals Today':
                elementIdPrefix = 'withdrawals';
                lastKnownValueKey = 'withdrawals';
                break;
            case 'Total Closed Accounts':
                elementIdPrefix = 'closed';
                lastKnownValueKey = 'closed_accounts';
                parseValue = (value) => parseInt(value.replace(' Accounts', ''));
                break;
            case 'Total Re-opened Accounts':
                elementIdPrefix = 'reopened';
                lastKnownValueKey = 'reopened_accounts';
                parseValue = (value) => parseInt(value.replace(' Accounts', ''));
                break;
            case 'Total Pending Accounts':
                elementIdPrefix = 'pending';
                lastKnownValueKey = 'pending_accounts';
                parseValue = (value) => parseInt(value.replace(' Accounts', ''));
                break;
            case 'Total Declined Accounts':
                elementIdPrefix = 'declined';
                lastKnownValueKey = 'declined_accounts';
                parseValue = (value) => parseInt(value.replace(' Accounts', ''));
                break;
            default:
                console.warn('Unknown dashboard item title:', item.title);
                return;
        }

        const numberElement = document.getElementById(`total-${elementIdPrefix}`);
        const updatedElement = document.getElementById(`${elementIdPrefix}-updated`);

        if (numberElement && updatedElement) {
            const currentParsedValue = parseValue(item.amount_count);

            if (lastKnownValues[lastKnownValueKey] !== currentParsedValue) {
                numberElement.textContent = item.amount_count; // Always display the original string from PHP
                updatedElement.textContent = `Last update: ${currentTime}`;
                lastKnownValues[lastKnownValueKey] = currentParsedValue;
            }
        }
    });
}

// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    const tellerInfo = sessionStorage.getItem('tellerInfo');
    if (!tellerInfo) {
        window.location.href = './bank_teller_login.html';
    }
});

// Load recent registration requests
async function loadRecentRegistrations() {
    try {
        const response = await fetch(`${API_BASE_URL}/teller/get_registrations.php`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || data.error || 'Failed to load registrations');
        }

        const registrationList = document.getElementById('recent_registrations');
        const registrations = data.registrations.slice(0, 3); // Show only 3 most recent

        if (registrations.length === 0) {
            registrationList.innerHTML = `
                <div class="no-data">
                    No pending registration requests
                </div>
            `;
            return;
        }

        registrationList.innerHTML = registrations.map(reg => `
            <div class="registration-item" data-id="${reg.registration_id}">
                <div class="registration-info">
                    <div class="registration-icon">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="registration-details">
                        <div class="registration-name">${reg.first_name} ${reg.last_name}</div>
                        <div class="registration-date">Submitted on ${formatDate(reg.created_at)}</div>
                    </div>
                </div>
                <div class="registration-actions">
                    <button class="action-btn approve" onclick="handleRegistration(${reg.registration_id}, 'approve')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn deny" onclick="handleRegistration(${reg.registration_id}, 'deny')">
                        <i class="fas fa-times"></i> Deny
                    </button>
                </div>
            </div>
        `).join('');

        // Update pending count in summary
        document.getElementById('total-pending').textContent = `${data.registrations.length} Requests`;
        document.getElementById('pending-updated').textContent = formatTime(new Date());

    } catch (error) {
        console.error('Error loading registrations:', error);
        showNotification('Error loading registration requests: ' + error.message, 'error');
    }
}

// Handle registration approval/denial
async function handleRegistration(registrationId, action) {
    try {
        const response = await fetch(`${API_BASE_URL}/teller/review_registration.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                registration_id: registrationId,
                action: action
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || data.error || 'Operation failed');
        }

        showNotification(`Registration ${action === 'approve' ? 'approved' : 'denied'} successfully`, 'success');
        loadRecentRegistrations(); // Refresh the list

    } catch (error) {
        console.error('Error handling registration:', error);
        showNotification(`Error ${action === 'approve' ? 'approving' : 'denying'} registration: ${error.message}`, 'error');
    }
}

// Format date for display
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}
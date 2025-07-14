/* ========================================
   BANK TELLER DASHBOARD JAVASCRIPT
   ======================================== */

import { API_ENDPOINTS } from '/api_config.js';

// ========================================
// GLOBAL VARIABLES & CONFIGURATION
// ========================================

// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));

// Validate teller session
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "/login";
}

// Keep track of last known values to detect changes
let lastKnownValues = {
    deposits: '0.00',
    withdrawals: '0.00',
    closed_accounts: 0,
    reopened_accounts: 0,
    pending_accounts: 0,
    declined_accounts: 0
};

// Search functionality variables
let searchTimeout = null;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Display notification messages to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification ('info', 'success', 'error', 'warning')
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification_container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => container.removeChild(notification), 300);
    }, 3000);
}

/**
 * Format date for display
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date string
 */
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

/**
 * Make API request with error handling
 * @param {string} url - The API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise} The API response
 */
async function makeApiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            credentials: 'include',
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

/**
 * Set up search functionality with debouncing
 */
function setupSearch() {
    const searchInput = document.getElementById('quick_search');
    const searchResults = document.getElementById('search_results');

    if (!searchInput) return;

    // Handle input changes with debouncing
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Hide results if search term is empty
        if (searchTerm.length === 0) {
            searchResults.classList.add('hidden');
            searchResults.classList.remove('block');
            return;
        }

        // Show loading state
        searchResults.classList.remove('hidden');
        searchResults.classList.add('block');
        searchResults.innerHTML = `
            <div class="loading-results">
                <i class="fas fa-spinner fa-spin"></i>
                Searching...
            </div>`;

        // Debounce search (wait 300ms after user stops typing)
        searchTimeout = setTimeout(() => performSearch(searchTerm), 300);
    });

    // Show results again on focus if input is not empty
    searchInput.addEventListener('focus', () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length > 0) {
            performSearch(searchTerm);
        }
    });

    // Show results on Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value.trim();
            if (searchTerm.length > 0) {
                performSearch(searchTerm);
            }
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
            searchResults.classList.remove('block');
        }
    });
}

/**
 * Perform account search
 * @param {string} searchTerm - The search term
 */
async function performSearch(searchTerm) {
    try {
        const data = await makeApiRequest(
            `${API_ENDPOINTS.TELLER_SEARCH_ACCOUNT}?search=${encodeURIComponent(searchTerm)}&teller_number=${tellerInfo.teller_number}`
        );

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

        // Render compact clickable results
        searchResults.innerHTML = data.accounts.map(account => `
            <div class='search-result-item' style='cursor:pointer; padding:10px; border-bottom:1px solid #eee;' data-account='${account.account_number}'>
                <div><strong>${account.user.name}</strong></div>
                <div>Account No: ${account.account_number}</div>
                <div>Balance: ₱${Number(account.balance.toString().replace(/,/g, '')).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                <div>Status: <span class='status-text ${account.status}'>${account.status}</span></div>
            </div>
        `).join('');
        
        searchResults.classList.remove('hidden');
        searchResults.classList.add('block');

        // Add click event to each result
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const accountNumber = item.getAttribute('data-account');
                window.location.href = `bank_teller_search_account.html?account=${encodeURIComponent(accountNumber)}`;
            });
        });
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

// ========================================
// DASHBOARD DATA MANAGEMENT
// ========================================

/**
 * Fetch dashboard summary data from the server
 */
async function fetchDashboardSummary() {
    try {
        const data = await makeApiRequest(
            `${API_ENDPOINTS.TELLER_DASHBOARD}?teller_number=${tellerInfo.teller_number}`
        );

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

/**
 * Update dashboard summary in the UI
 * @param {Array} summary - Array of summary data
 */
function updateDashboardSummary(summary) {
    const summaryMappings = {
        'Total Deposits Today': { prefix: 'deposits', key: 'deposits' },
        'Total Withdrawals Today': { prefix: 'withdrawals', key: 'withdrawals' },
        'Total Closed Accounts': { prefix: 'closed', key: 'closed_accounts', parser: (value) => parseInt(value.replace(' Accounts', '')) },
        'Total Re-opened Accounts': { prefix: 'reopened', key: 'reopened_accounts', parser: (value) => parseInt(value.replace(' Accounts', '')) },
        'Total Pending Accounts': { prefix: 'pending', key: 'pending_accounts', parser: (value) => parseInt(value.replace(' Accounts', '')) },
        'Total Declined Accounts': { prefix: 'declined', key: 'declined_accounts', parser: (value) => parseInt(value.replace(' Accounts', '')) }
    };

    summary.forEach(item => {
        const mapping = summaryMappings[item.title];
        if (!mapping) {
            console.warn('Unknown dashboard item title:', item.title);
            return;
        }

        const numberElement = document.getElementById(`total-${mapping.prefix}`);
        if (!numberElement) return;

        const parseValue = mapping.parser || ((value) => value);
        const currentParsedValue = parseValue(item.amount_count);

        // Only update if value has changed
        if (lastKnownValues[mapping.key] !== currentParsedValue) {
            numberElement.textContent = item.amount_count;
            lastKnownValues[mapping.key] = currentParsedValue;
        }
    });
}

// ========================================
// REGISTRATION MANAGEMENT
// ========================================

/**
 * Load recent registration requests
 */
async function loadRecentRegistrations() {
    try {
        const data = await makeApiRequest(
            `${API_ENDPOINTS.TELLER_REGISTRATIONS}?teller_number=${tellerInfo.teller_number}`
        );

        if (!data.success) {
            throw new Error(data.message || data.error || 'Failed to load registrations');
        }

        const registrationList = document.getElementById('recent_registrations');
        const registrations = data.registrations.slice(0, 2); // Show only 2 most recent

        if (registrations.length === 0) {
            registrationList.innerHTML = `
                <div class="no-data">
                    No pending registration requests
                </div>
            `;
            return;
        }

        // Generate HTML for registration items
        const registrationHTML = registrations.map(reg => `
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
                    <button class="action-btn approve" onclick="handleRegistration(${reg.registration_id}, 'approve')" data-registration-id="${reg.registration_id}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn deny" onclick="handleRegistration(${reg.registration_id}, 'deny')" data-registration-id="${reg.registration_id}">
                        <i class="fas fa-times"></i> Deny
                    </button>
                </div>
            </div>
        `).join('');
        
        registrationList.innerHTML = registrationHTML;

        // Update pending count in summary
        document.getElementById('total-pending').textContent = `${data.registrations.length} Requests`;

    } catch (error) {
        console.error('Error loading registrations:', error);
        showNotification('Error loading registration requests: ' + error.message, 'error');
    }
}

/**
 * Disable all action buttons in a registration item
 * @param {number} registrationId - The registration ID
 */
function disableRegistrationButtons(registrationId) {
    const registrationItem = document.querySelector(`[data-id="${registrationId}"]`);
    if (registrationItem) {
        const buttons = registrationItem.querySelectorAll('.action-btn');
        buttons.forEach(button => {
            button.disabled = true;
            button.style.opacity = '0.7';
        });
    }
}

/**
 * Enable all action buttons in a registration item
 * @param {number} registrationId - The registration ID
 */
function enableRegistrationButtons(registrationId) {
    const registrationItem = document.querySelector(`[data-id="${registrationId}"]`);
    if (registrationItem) {
        const buttons = registrationItem.querySelectorAll('.action-btn');
        buttons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '1';
        });
    }
}

/**
 * Handle registration approval/denial
 * @param {number} registrationId - The registration ID
 * @param {string} action - The action to perform ('approve' or 'deny')
 */
async function handleRegistration(registrationId, action) {
    // Get the button that was clicked
    const button = event.target.closest('.action-btn');
    const originalContent = button.innerHTML;
    
    // Disable all buttons in this registration item
    disableRegistrationButtons(registrationId);
    
    // Show loading state on the clicked button
    button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i> 
        ${action === 'approve' ? 'Approving' : 'Denying'}...
    `;
    
    try {
        const data = await makeApiRequest(`${API_ENDPOINTS.TELLER_REVIEW_REGISTRATION}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                registration_id: registrationId,
                action: action
            })
        });

        if (!data.success) {
            throw new Error(data.message || data.error || 'Operation failed');
        }

        showNotification(`Registration ${action === 'approve' ? 'approved' : 'denied'} successfully`, 'success');
        loadRecentRegistrations(); // Refresh the list

    } catch (error) {
        console.error('Error handling registration:', error);
        showNotification(`Error ${action === 'approve' ? 'approving' : 'denying'} registration: ${error.message}`, 'error');
        
        // Restore button to original state on error
        button.innerHTML = originalContent;
        enableRegistrationButtons(registrationId);
    }
}

// ========================================
// USER INTERFACE INITIALIZATION
// ========================================

/**
 * Initialize the user interface elements
 */
function initializeUI() {
    // Update name in sidebar and greeting section
    const nameTextElement = document.querySelector(".name-text");
    const avatarElement = document.querySelector(".user-avatar.dynamic-avatar");
    
    let firstName = '';
    if (tellerInfo.first_name) {
        firstName = tellerInfo.first_name;
    } else if (tellerInfo.name) {
        // If only a full name is available, use the first word as first name
        firstName = tellerInfo.name.split(' ')[0];
    }
    
    // Only update greeting and avatar, not sidebar username
    if (nameTextElement) {
        nameTextElement.textContent = firstName + "!";
    }
    
    // Set avatar initial
    if (avatarElement && firstName) {
        const initial = firstName.trim().charAt(0).toUpperCase();
        avatarElement.textContent = initial;
    }
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
    // No logout logic needed here; handled by logout.js
}

/**
 * Set up auto-refresh intervals for real-time updates
 */
function setupAutoRefresh() {
    // Set up auto-refresh every 5 minutes for dashboard summary
    setInterval(fetchDashboardSummary, 5 * 60 * 1000);
    
    // Refresh registrations every 30 seconds
    setInterval(loadRecentRegistrations, 30000);
}

// ========================================
// MAIN INITIALIZATION
// ========================================

/**
 * Main initialization function
 */
function initializeDashboard() {
    // Initialize UI elements
    initializeUI();
    
    // Set up search functionality
    setupSearch();
    
    // Set up event listeners
    setupEventListeners();
    
    // Fetch initial data
    fetchDashboardSummary();
    loadRecentRegistrations();
    
    // Set up auto-refresh
    setupAutoRefresh();
}

// ========================================
// SESSION VALIDATION
// ========================================

/**
 * Check if user is logged in
 */
function validateSession() {
    const tellerInfo = sessionStorage.getItem('tellerInfo');
    if (!tellerInfo) {
        window.location.href = './bank_teller_login.html';
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    validateSession();
    initializeDashboard();
});
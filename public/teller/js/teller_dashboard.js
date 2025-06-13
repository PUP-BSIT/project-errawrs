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

// Update teller name in the UI
document.addEventListener("DOMContentLoaded", () => {
    // Update name in sidebar and welcome section
    const userNameElements = document.querySelectorAll(".user-name");
    const nameTextElement = document.querySelector(".name-text");
    
    if (tellerInfo.name) {
        userNameElements.forEach(el => el.textContent = tellerInfo.name);
        nameTextElement.textContent = tellerInfo.name + "!";
    }

    // Fetch and update dashboard summary
    fetchDashboardSummary();

    // Set up auto-refresh every 5 minutes
    setInterval(fetchDashboardSummary, 5 * 60 * 1000);

    // Load recent registrations
    loadRecentRegistrations();
    
    // Refresh registrations every 30 seconds
    setInterval(loadRecentRegistrations, 30000);
});

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

// Load recent registration requests
async function loadRecentRegistrations() {
    try {
        const response = await fetch('../../src/api/teller/get_registrations.php');
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
        const response = await fetch('../../src/api/teller/review_registration.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
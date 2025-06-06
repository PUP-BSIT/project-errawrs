// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "./bank_teller_login.html";
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
});

// Handle logout
document.querySelector('.nav-logout a').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Clear session storage
    sessionStorage.removeItem('tellerInfo');
    
    // Redirect to login page
    window.location.href = './bank_teller_login.html';
});

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
    // Update deposits
    document.getElementById('total-deposits').textContent = `₱${summary.deposits.amount}`;
    document.getElementById('deposits-updated').textContent = summary.deposits.last_updated;

    // Update withdrawals
    document.getElementById('total-withdrawals').textContent = `₱${summary.withdrawals.amount}`;
    document.getElementById('withdrawals-updated').textContent = summary.withdrawals.last_updated;

    // Update closed accounts
    document.getElementById('total-closed').textContent = `${summary.closed_accounts.count} Account${summary.closed_accounts.count !== 1 ? 's' : ''}`;
    document.getElementById('closed-updated').textContent = summary.closed_accounts.last_updated;

    // Update reopened accounts
    document.getElementById('total-reopened').textContent = `${summary.reopened_accounts.count} Account${summary.reopened_accounts.count !== 1 ? 's' : ''}`;
    document.getElementById('reopened-updated').textContent = summary.reopened_accounts.last_updated;
}

// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    const tellerInfo = sessionStorage.getItem('tellerInfo');
    if (!tellerInfo) {
        window.location.href = './bank_teller_login.html';
    }
});
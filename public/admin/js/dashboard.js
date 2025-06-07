// State variables
let autoRefreshInterval;

// DOM Elements
const logoutBtn = document.getElementById('logout_btn');
const profileBtn = document.querySelector('.profile-btn');
const dashboardLink = document.querySelector('a[href="dashboard.html"]');
const tellerLink = document.querySelector('a[href="manage_tellers.html"]');
const sidebarToggle = document.getElementById('sidebar_toggle');
const sidebar = document.querySelector('.sidebar');

// Initialize dashboard
function initDashboard() {
    loadAdminInfo();
    setupEventListeners();
    loadDashboardStats();
    setupSidebarToggle();
    loadRecentUserAccounts();
    setupAutoRefresh();
}

// Set up auto-refresh
function setupAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Refresh dashboard stats every 5 minutes
    autoRefreshInterval = setInterval(() => {
        loadDashboardStats();
        loadRecentUserAccounts();
    }, 5 * 60 * 1000);
}

// Event Listeners Setup
function setupEventListeners() {
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Profile dropdown (for mobile)
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            const dropdown = document.querySelector('.dropdown-content');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    }

    // Show dashboard section when clicking the nav link
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            e.target.closest('.nav-item').classList.add('active');
            
            hideAllSections();
            const dashboardSection = document.querySelector('.dashboard-section');
            if (dashboardSection) {
                dashboardSection.classList.add('active');
            }
        });
    }

    // Show teller section when clicking the nav link
    if (tellerLink) {
        tellerLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'manage_tellers.html';
        });
    }

    // Event Listeners for teller management
    const createTellerBtn = document.getElementById('create_teller_btn');
    if (createTellerBtn) {
        createTellerBtn.addEventListener('click', () => showModal(createTellerModal));
    }

    const cancelCreateBtn = document.getElementById('cancel_create');
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', () => hideModal(createTellerModal));
    }

    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => hideModal(createTellerModal));
    }

    const createAnotherBtn = document.getElementById('create_another');
    if (createAnotherBtn) {
        createAnotherBtn.addEventListener('click', handleCreateAnother);
    }

    const doneCreatingBtn = document.getElementById('done_creating');
    if (doneCreatingBtn) {
        doneCreatingBtn.addEventListener('click', handleDone);
    }

    const searchInput = document.getElementById('search_teller');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Password toggle functionality
    const passwordToggles = document.querySelectorAll('.password-toggle');
    if (passwordToggles.length > 0) {
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                const icon = this.querySelector('i');

                if (input && icon) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    } else {
                        input.type = 'password';
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    }
                }
            });
        });
    }
}

// Sidebar Toggle Setup
function setupSidebarToggle() {
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

// Load Admin Info
async function loadAdminInfo() {
    try {
        const response = await fetch('/project-errawrs/src/api/admin/info.php', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch admin info');
        }

        const data = await response.json();
        if (data.success) {
            // Update admin name
            const adminNameElement = document.getElementById('admin_name');
            if (adminNameElement) {
                adminNameElement.textContent = data.admin.first_name || 'Admin';
            }
        } else {
            console.error('Failed to load admin info:', data.message);
        }
    } catch (error) {
        console.error('Error loading admin info:', error);
        // Redirect to login if unauthorized
        if (error.message.includes('unauthorized')) {
            window.location.href = 'login.html';
        }
    }
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const response = await fetch('/project-errawrs/src/api/admin/dashboard_stats.php', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard stats');
        }

        const data = await response.json();
        if (data.success) {
            updateDashboardStats(data.stats);
        } else {
            console.error('Failed to load dashboard stats:', data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Update Dashboard Stats
function updateDashboardStats(stats) {
    const statCards = {
        total_users: {
            numberEl: document.getElementById('total_users'),
            changeEl: document.getElementById('total_users').nextElementSibling,
            icon: 'fa-users'
        },
        total_transactions: {
            numberEl: document.getElementById('total_transactions'),
            changeEl: document.getElementById('total_transactions').nextElementSibling,
            icon: 'fa-money-bill-wave'
        },
        active_tellers: {
            numberEl: document.getElementById('active_tellers'),
            changeEl: document.getElementById('active_tellers').nextElementSibling,
            icon: 'fa-user-tie'
        },
        pending_issues: {
            numberEl: document.getElementById('pending_issues'),
            changeEl: document.getElementById('pending_issues').nextElementSibling,
            icon: 'fa-exclamation-triangle'
        }
    };

    // Update each stat card with animation
    for (const [key, elements] of Object.entries(statCards)) {
        if (stats[key] && elements.numberEl) {
            // Animate number change
            animateNumber(elements.numberEl, stats[key].count);
            
            // Update change percentage
            if (elements.changeEl) {
                const change = stats[key].change;
                const changeText = change === 0 ? 'No change' : 
                                `${change > 0 ? '+' : ''}${change}% from last month`;
                
                elements.changeEl.textContent = changeText;
                
                // Update change status class
                elements.changeEl.className = 'stat-change ' + 
                    (change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral');
            }
        }
    }
}

// Animate Number
function animateNumber(element, newValue) {
    const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const duration = 1000; // Animation duration in milliseconds
    const steps = 60; // Number of steps in animation
    const increment = (newValue - startValue) / steps;
    let currentStep = 0;

    const animation = setInterval(() => {
        currentStep++;
        const currentValue = Math.round(startValue + (increment * currentStep));
        element.textContent = formatNumber(currentValue);

        if (currentStep >= steps) {
            clearInterval(animation);
            element.textContent = formatNumber(newValue);
        }
    }, duration / steps);
}

// Format Number
function formatNumber(number) {
    return new Intl.NumberFormat().format(number);
}

// Handle Logout
async function handleLogout(e) {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = '/project-errawrs/public/admin/login.html';
}

// Load Recent User Accounts
async function loadRecentUserAccounts() {
    try {
        const response = await fetch('/project-errawrs/src/api/admin/recent_accounts.php', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch recent accounts');
        }

        const data = await response.json();
        if (data.success) {
            updateRecentAccounts(data.accounts);
        } else {
            console.error('Failed to load recent accounts:', data.message);
        }
    } catch (error) {
        console.error('Error loading recent accounts:', error);
    }
}

// Update Recent Accounts
function updateRecentAccounts(accounts) {
    const activityList = document.getElementById('recent_activity');
    if (!activityList) return;

    activityList.innerHTML = accounts.map(account => `
        <div class="activity-item">
            <div class="activity-icon ${getAccountStatusIcon(account.status)}">
                <i class="fas ${getAccountTypeIcon(account.account_type)}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-text">
                    ${account.first_name} ${account.last_name} - ${account.account_number}
                </div>
                <div class="activity-info">
                    <span class="account-type">${account.account_type}</span>
                    <span class="account-status ${account.status}">${account.status}</span>
                </div>
                <div class="activity-time">
                    ${formatTimeAgo(account.created_at)}
                </div>
            </div>
        </div>
    `).join('');
}

// Helper Functions
function getAccountStatusIcon(status) {
    switch (status) {
        case 'active':
            return 'status-active';
        case 'inactive':
            return 'status-inactive';
        case 'closed':
            return 'status-closed';
        default:
            return '';
    }
}

function getAccountTypeIcon(type) {
    switch (type.toLowerCase()) {
        case 'savings':
            return 'fa-piggy-bank';
        case 'credit':
            return 'fa-credit-card';
        default:
            return 'fa-user-circle';
    }
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Teller Management
const tellerSection = document.getElementById('teller_section');
const createTellerBtn = document.getElementById('create_teller_btn');
const createTellerModal = document.getElementById('create_teller_modal');
const createTellerForm = document.getElementById('create_teller_form');
const cancelCreateBtn = document.getElementById('cancel_create');
const closeBtn = document.querySelector('.close-btn');
const successModal = document.getElementById('success_modal');
const createAnotherBtn = document.getElementById('create_another');
const doneCreatingBtn = document.getElementById('done_creating');
const searchInput = document.getElementById('search_teller');
const passwordToggles = document.querySelectorAll('.password-toggle');

function showModal(modal) {
    modal.classList.add('show');
}

function hideModal(modal) {
    modal.classList.remove('show');
}

function handleCreateAnother() {
    hideModal(successModal);
    showModal(createTellerModal);
}

function handleDone() {
    hideModal(successModal);
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    loadTellers(searchTerm);
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions for card actions
function editTeller(tellerId) {
    // TODO: Implement edit functionality
    console.log('Edit teller:', tellerId);
}

async function toggleTellerStatus(tellerId) {
    try {
        const response = await fetch('/project-errawrs/src/api/admin/toggle_teller_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teller_id: tellerId }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to toggle status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            // Refresh the tellers list
            loadTellers(document.getElementById('search_teller').value);
        } else {
            alert(data.message || 'Failed to update teller status');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating teller status');
    }
}

function updatePagination(total, currentPage, limit) {
    const totalPages = Math.ceil(total / limit);
    const paginationContainer = document.getElementById('teller_pagination');
    
    if (!paginationContainer) {
        return;
    }
    
    let paginationHtml = '';
    
    // Previous button
    paginationHtml += `
        <button class="pagination-btn" 
                onclick="loadTellers('${searchInput.value}', ${currentPage - 1})"
                ${currentPage <= 1 ? 'disabled' : ''}>
            Previous
        </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                    onclick="loadTellers('${searchInput.value}', ${i})">
                ${i}
            </button>`;
    }
    
    // Next button
    paginationHtml += `
        <button class="pagination-btn"
                onclick="loadTellers('${searchInput.value}', ${currentPage + 1})"
                ${currentPage >= totalPages ? 'disabled' : ''}>
            Next
        </button>`;
    
    paginationContainer.innerHTML = paginationHtml;
} 
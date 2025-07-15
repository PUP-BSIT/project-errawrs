import { API_ENDPOINTS } from '/api_config.js';

let searchTimeout = null;

// DOM Elements
let adminNameElement;
let searchType, unifiedSearch, unifiedResults;

// Initialization

document.addEventListener('DOMContentLoaded', () => {
    adminNameElement = document.getElementById('admin_name');
    searchType = document.getElementById('search_type');
    unifiedSearch = document.getElementById('unified_search');
    unifiedResults = document.getElementById('unified_results');

    loadAdminInfo();
    setupEventListeners();
    loadDashboardStats();
    setupSidebarToggle();
    setupUnifiedSearch();
});

function setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout_btn');
        if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        }

        // Profile dropdown (for mobile)
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                const dropdown = document.querySelector('.dropdown-content');
                if (dropdown) {
                    dropdown.classList.toggle('show');
                }
            });
        }

        // Show dashboard section when clicking the nav link
        const dashboardLink = document.querySelector('a[href="/dashboard"]');
        if (dashboardLink) {
            dashboardLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(item => 
                      item.classList.remove('active'));
                e.target.closest('.nav-item').classList.add('active');
                hideAllSections();
                const dashboardSection = document.querySelector('.dashboard-section');
                if (dashboardSection) {
                    dashboardSection.classList.add('active');
                }
            });
        }

        // Show teller section when clicking the nav link
        const tellerLink = document.querySelector('a[href="manage_tellers.html"]');
        if (tellerLink) {
            tellerLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'manage_tellers.html';
            });
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

function setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar_toggle');
        const sidebar = document.querySelector('.sidebar');
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
    }

function setupUnifiedSearch() {
    if (searchType && unifiedSearch) {
        searchType.addEventListener('change', () => {
            unifiedSearch.value = '';
            unifiedResults.innerHTML = '';
            unifiedSearch.placeholder = searchType.value === 'teller'
                ? 'Search teller by name, ID or email...'
                : 'Search user by name or account number...';
        });

        unifiedSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.trim();
            if (searchTerm.length === 0) {
                unifiedResults.innerHTML = '';
                return;
            }
            unifiedResults.innerHTML = '';
            searchTimeout = setTimeout(() => {
                if (searchType.value === 'teller') {
                    handleTellerSearch(searchTerm, unifiedResults);
                } else {
                    handleUserSearch(searchTerm, unifiedResults);
                }
            }, 300);
        });
    }
}

async function loadAdminInfo() {
        try {
            const response = await fetch(API_ENDPOINTS.ADMIN_INFO, { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch admin info');
            }
            const data = await response.json();
            if (data.success) {
                if (adminNameElement) {
                    adminNameElement.textContent = data.admin.first_name || 'Admin';
                }
            } else {
                console.error('Failed to load admin info:', data.message);
            showNotification('Unauthorized: Please log in again.', 'error');
            }
        } catch (error) {
            console.error('Error loading admin info:', error);
            if (error.message.toLowerCase().includes('unauthorized')) {
            showNotification('Unauthorized: Please log in again.', 'error');
            } else {
            showNotification('Error loading admin info', 'error');
            }
        }
    }

async function loadDashboardStats() {
        try {
            const response = await fetch(API_ENDPOINTS.ADMIN_DASHBOARD, { credentials: 'include' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
            updateDashboardStats(data.stats);
            } else {
                console.error('Failed to load dashboard stats:', data.message);
            showNotification('Failed to load dashboard stats', 'error');
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        showNotification('Error loading dashboard stats', 'error');
        }
    }

function updateDashboardStats(stats) {
        const elements = {
            total_users: document.getElementById('total_users'),
            total_transactions: document.getElementById('total_transactions'),
            active_tellers: document.getElementById('active_tellers'),
            pending_tellers: document.getElementById('pending_tellers')
        };
        for (const [key, element] of Object.entries(elements)) {
            if (element && stats[key] !== undefined) {
            element.textContent = formatNumber(stats[key]);
            }
        }
    }

function formatNumber(number) {
        return new Intl.NumberFormat().format(number);
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

async function handleLogout(e) {
        e.preventDefault();
        try {
            await fetch(API_ENDPOINTS.USER_LOGOUT, { method: 'POST', credentials: 'include' });
    } catch (err) {}
        sessionStorage.clear();
        window.location.href = '/login';
    }

function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        if (type === 'error') {
            notification.classList.add('notification-error');
        }
        notification.innerHTML = `
            <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

function getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return 'fa-check-circle';
            case 'error':
                return 'fa-exclamation-circle';
            case 'warning':
                return 'fa-exclamation-triangle';
            default:
                return 'fa-info-circle';
        }
    }

async function handleTellerSearch(searchTerm, resultsContainer = unifiedResults) {
    try {
        resultsContainer.innerHTML = `
            <div class="loading-state">
                <p>Searching tellers...</p>
            </div>`;
        const response = await fetch(`${API_ENDPOINTS.ADMIN_LIST_TELLERS}?search=${encodeURIComponent(searchTerm)}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch tellers');
        const data = await response.json();
        if (!data.success) {
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load tellers</p>
                </div>`;
            return;
        }
        if (data.tellers.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No tellers found</p>
                </div>`;
            return;
        }
        const cardsHtml = data.tellers.map(teller => `
            <div class="user-card">
                <div class="user-header">
                    <div class="user-info">
                        <h3 class="user-name">${teller.first_name} ${teller.last_name}</h3>
                        <span class="account-number">${teller.teller_number}</span>
                    </div>
                    <span class="status-badge ${teller.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${teller.status}
                    </span>
                </div>
                <div class="user-details">
                    <div class="detail-item">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${teller.email}</span>
                    </div>
                </div>
            </div>
        `).join('');
        resultsContainer.innerHTML = `<div class="card-grid">${cardsHtml}</div>`;
    } catch (error) {
        console.error('Error searching tellers:', error);
        resultsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>An error occurred while searching</p>
            </div>`;
    }
}

async function handleUserSearch(searchTerm, resultsContainer = unifiedResults) {
    try {
        resultsContainer.innerHTML = `
            <div class="loading-state">
                <p>Searching accounts...</p>
            </div>`;
        const response = await fetch(`${API_ENDPOINTS.ADMIN_LIST_USERS}?search=${encodeURIComponent(searchTerm)}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        if (!data.success) {
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load users</p>
                </div>`;
            return;
        }
        if (!Array.isArray(data.list) || data.list.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No users found</p>
                </div>`;
            return;
        }
        const cardsHtml = data.list.map(user => `
            <div class="user-card">
                <div class="user-header">
                    <div class="user-info">
                        <h3 class="user-name">${user.first_name} ${user.last_name}</h3>
                        <span class="account-number">${user.account_number || 'No Account'}</span>
                    </div>
                    <span class="status-badge ${(user.account_status === 'active' ? 'status-active' : 'status-inactive')}">
                        ${user.account_status || 'active'}
                    </span>
                </div>
                <div class="user-details">
                    <div class="detail-item">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">${user.username}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${user.phone_number || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Created</span>
                        <span class="detail-value">${formatDate(user.user_created_at)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        resultsContainer.innerHTML = `<div class="card-grid">${cardsHtml}</div>`;
    } catch (error) {
        console.error('Error searching users:', error);
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>An error occurred while searching</p>
                </div>`;
        }
    }
}

function hideAllSections() {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
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

// Session check on page load
(async function() {
    try {
        const res = await fetch(API_ENDPOINTS.ADMIN_SESSION_CHECK, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) {
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        }
    } catch (e) {
        setTimeout(() => {
            window.location.href = '/login';
        }, 3000);
    }
})();

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        window.location.reload();
    }
});
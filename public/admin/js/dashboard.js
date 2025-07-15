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
            // Fetch all data for the selected type
            if (searchType.value === 'teller') {
                fetchAllTellers();
            } else {
                fetchAllUsers();
            }
        });

        unifiedSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim().toLowerCase();
            if (searchType.value === 'teller') {
                filterTellerResults(searchTerm, unifiedResults);
            } else {
                filterUserResults(searchTerm, unifiedResults);
            }
        });

        // Initial fetch for default type
        if (searchType.value === 'teller') {
            fetchAllTellers();
        } else {
            fetchAllUsers();
        }
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

let allTellers = [];
let allUsers = [];

async function fetchAllTellers() {
    try {
        const response = await fetch(`${API_ENDPOINTS.ADMIN_LIST_TELLERS}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch tellers');
        const data = await response.json();
        if (!data.success) throw new Error('Failed to load tellers');
        allTellers = data.tellers || [];
        filterTellerResults(unifiedSearch.value.trim().toLowerCase(), unifiedResults);
    } catch (error) {
        unifiedResults.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Failed to load tellers</p></div>`;
    }
}

async function fetchAllUsers() {
    try {
        const response = await fetch(`${API_ENDPOINTS.ADMIN_LIST_USERS}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        if (!data.success) throw new Error('Failed to load users');
        allUsers = data.list || [];
        filterUserResults(unifiedSearch.value.trim().toLowerCase(), unifiedResults);
    } catch (error) {
        unifiedResults.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Failed to load users</p></div>`;
    }
}

function filterTellerResults(searchTerm, resultsContainer) {
    if (!searchTerm) {
        resultsContainer.innerHTML = '';
        return;
    }
    if (!allTellers.length) {
        resultsContainer.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><p>No tellers found</p></div>`;
        return;
    }
    let filtered = allTellers;
    if (searchTerm) {
        filtered = allTellers.filter(teller =>
            (`${teller.first_name} ${teller.last_name}`.toLowerCase().includes(searchTerm) ||
            (teller.teller_number && teller.teller_number.toString().toLowerCase().includes(searchTerm)) ||
            (teller.email && teller.email.toLowerCase().includes(searchTerm)))
        );
    }
    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><p>No tellers found</p></div>`;
        return;
    }
    const cardsHtml = filtered.map(teller => `
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
}

function filterUserResults(searchTerm, resultsContainer) {
    if (!searchTerm) {
        resultsContainer.innerHTML = '';
        return;
    }
    if (!allUsers.length) {
        resultsContainer.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><p>No users found</p></div>`;
        return;
    }
    let filtered = allUsers;
    if (searchTerm) {
        filtered = allUsers.filter(user =>
            (`${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm) ||
            (user.user_id && user.user_id.toString().toLowerCase().includes(searchTerm)) ||
            (user.username && user.username.toLowerCase().includes(searchTerm)) ||
            (user.account_number && user.account_number.toLowerCase().includes(searchTerm)))
        );
    }
    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><p>No users found</p></div>`;
        return;
    }
    const cardsHtml = filtered.map(user => `
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
}
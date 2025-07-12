class AdminDashboard {
    constructor() {
        this.init();
        this.searchTimeout = null;
    }

    init() {
        this.loadAdminInfo();
        this.setupEventListeners();
        this.loadDashboardStats();
        this.setupSidebarToggle();
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout_btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }

        // Profile dropdown (for mobile)
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                const dropdown = document.querySelector('.dropdown-content');
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            });
        }

        // Show dashboard section when clicking the nav link
        const dashboardLink = document.querySelector('a[href="dashboard.html"]');
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
        const tellerLink = document.querySelector('a[href="manage_tellers.html"]');
        if (tellerLink) {
            tellerLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'manage_tellers.html';
            });
        }

        // Search event listeners with debounce
        const tellerSearch = document.getElementById('teller_search');
        if (tellerSearch) {
            tellerSearch.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                const searchTerm = e.target.value.trim();
                
                if (searchTerm.length === 0) {
                    document.getElementById('teller_results').innerHTML = '';
                    return;
                }

                // Show loading state
                const tellerResults = document.getElementById('teller_results');
                tellerResults.innerHTML = '';
                const loadingState = tellerResults.querySelector('.loading-state');
                if (loadingState) loadingState.style.display = 'block';

                this.searchTimeout = setTimeout(() => {
                    this.handleTellerSearch(searchTerm);
                }, 300);
            });
        }

        const userSearch = document.getElementById('user_search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                const searchTerm = e.target.value.trim();
                
                if (searchTerm.length === 0) {
                    document.getElementById('user_results').innerHTML = '';
                    return;
                }

                // Show loading state
                const userResults = document.getElementById('user_results');
                userResults.innerHTML = '';
                const loadingState = userResults.querySelector('.loading-state');
                if (loadingState) loadingState.style.display = 'block';

                this.searchTimeout = setTimeout(() => {
                    this.handleUserSearch(searchTerm);
                }, 300);
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

    setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar_toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
    }

    async loadAdminInfo() {
        try {
            		const response = await fetch(APP_CONFIG.getApiUrl('admin/info.php'), {
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
                this.showNotification('Unauthorized: Please log in again.', 'error');
            }
        } catch (error) {
            console.error('Error loading admin info:', error);
            if (error.message.toLowerCase().includes('unauthorized')) {
                this.showNotification('Unauthorized: Please log in again.', 'error');
            } else {
                this.showNotification('Error loading admin info', 'error');
            }
        }
    }

    async loadDashboardStats() {
        try {
            console.log('Loading dashboard stats...');
            		const response = await fetch(APP_CONFIG.getApiUrl('admin/dashboard_stats.php'), {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Dashboard stats response:', data);

            if (data.success) {
                this.updateDashboardStats(data.stats);
            } else {
                console.error('Failed to load dashboard stats:', data.message);
                this.showNotification('Failed to load dashboard stats', 'error');
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showNotification('Error loading dashboard stats', 'error');
        }
    }

    updateDashboardStats(stats) {
        console.log('Updating dashboard stats:', stats);
        
        // Update statistics
        const elements = {
            total_users: document.getElementById('total_users'),
            total_transactions: document.getElementById('total_transactions'),
            active_tellers: document.getElementById('active_tellers'),
            pending_tellers: document.getElementById('pending_tellers')
        };

        for (const [key, element] of Object.entries(elements)) {
            if (element && stats[key] !== undefined) {
                console.log(`Updating ${key}:`, stats[key]);
                element.textContent = this.formatNumber(stats[key]);
            } else {
                console.warn(`Element not found or stat not available for ${key}`);
            }
        }
    }

    formatNumber(number) {
        return new Intl.NumberFormat().format(number);
    }

    async handleLogout(e) {
        e.preventDefault();
        try {
            await fetch('/project-errawrs/src/api/auth/logout.php', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            // Ignore errors, proceed with logout
        }
        sessionStorage.clear();
        window.location.href = '/project-errawrs/public/admin/login.html';
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        if (type === 'error') {
            notification.classList.add('notification-error');
        }
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>`;

        // Add to DOM (top right)
        document.body.appendChild(notification);

        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-hide notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    getNotificationIcon(type) {
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

    async handleTellerSearch(searchTerm) {
        try {
            const tellerResults = document.getElementById('teller_results');
            
            // Show loading state
            tellerResults.innerHTML = `
                <div class="loading-state">
                    <p>Searching tellers...</p>
                </div>`;
            
            		const response = await fetch(`${APP_CONFIG.getApiUrl('admin/list_tellers.php')}?search=${encodeURIComponent(searchTerm)}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch tellers');
            
            const data = await response.json();

            if (!data.success) {
                tellerResults.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load tellers</p>
                    </div>`;
                return;
            }

            if (data.tellers.length === 0) {
                tellerResults.innerHTML = `
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

            tellerResults.innerHTML = cardsHtml;

        } catch (error) {
            console.error('Error searching tellers:', error);
            tellerResults.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>An error occurred while searching</p>
                </div>`;
        }
    }

    async handleUserSearch(searchTerm) {
        const userResults = document.getElementById('user_results');
        try {
            // Show loading state
            userResults.innerHTML = `
                <div class="loading-state">
                    <p>Searching accounts...</p>
                </div>`;
            
            		const response = await fetch(`${APP_CONFIG.getApiUrl('admin/list_users.php')}?search=${encodeURIComponent(searchTerm)}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch users');
            
            const data = await response.json();

            if (!data.success) {
                userResults.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load users</p>
                    </div>`;
                return;
            }

            if (!Array.isArray(data.list) || data.list.length === 0) {
                userResults.innerHTML = `
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

            userResults.innerHTML = cardsHtml;

        } catch (error) {
            console.error('Error searching users:', error);
            if (userResults) {
                userResults.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>An error occurred while searching</p>
                    </div>`;
            }
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});

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

function hideAllSections() {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
}

// Functions
async function loadTellers(searchTerm = '', page = 1) {
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 10
        });
        
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        
        		const response = await fetch(`${APP_CONFIG.getApiUrl('admin/list_tellers.php')}?${params.toString()}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch tellers: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('teller_cards');
            container.innerHTML = ''; // Clear existing cards

            if (data.tellers.length === 0) {
                container.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <p>No tellers found</p>
                    </div>`;
                return;
            }

            data.tellers.forEach(teller => {
                const card = document.createElement('div');
                card.className = 'teller-card';
                card.innerHTML = `
                    <div class="teller-header">
                        <div class="teller-info">
                            <h3>${teller.first_name} ${teller.last_name}</h3>
                            <div class="teller-number">${teller.teller_number}</div>
                        </div>
                        <span class="status-badge ${teller.status === 'active' ? 'status-active' : 'status-inactive'}">
                            ${teller.status}
                        </span>
                    </div>
                    <div class="teller-details">
                        <div class="detail-row">
                            <span class="detail-label">Username:</span>
                            <span class="detail-value">${teller.username}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${teller.email}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Active:</span>
                            <span class="detail-value">${formatDate(teller.last_active)}</span>
                        </div>
                    </div>
                    <div class="teller-actions">
                        <button class="action-btn" onclick="editTeller(${teller.teller_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="toggleTellerStatus(${teller.teller_id})" 
                                title="${teller.status === 'active' ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-power-off"></i>
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });

            // Update pagination if there are results
            if (data.total > 0) {
                updatePagination(data.total, data.page, data.limit);
            }
        } else {
            console.error('Failed to load tellers:', data.message);
            // Show error message to user
            const container = document.getElementById('teller_cards');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load tellers. Please try again.</p>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading tellers:', error);
        // Show error message to user
        const container = document.getElementById('teller_cards');
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>An error occurred while loading tellers. Please try again.</p>
            </div>`;
    }
}

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
        		const response = await fetch(APP_CONFIG.getApiUrl('admin/toggle_teller_status.php'), {
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

// User Account Management
async function loadUsers(searchTerm = '') {
    try {
        const params = new URLSearchParams();
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        
        		const response = await fetch(`${APP_CONFIG.getApiUrl('admin/list_users.php')}?${params.toString()}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status}`);
        }

        const data = await response.json();
        const container = document.getElementById('user_results');
        
        if (!data.success) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load users. Please try again.</p>
                </div>`;
            return;
        }

        if (data.users.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No users found</p>
                </div>`;
            return;
        }

        container.innerHTML = '';
        data.users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-header">
                    <div class="user-info">
                        <h3 class="user-name">${user.first_name} ${user.last_name}</h3>
                        <span class="account-number">${user.account_number || 'No Account'}</span>
                    </div>
                    <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${user.status || 'active'}
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
                        <span class="detail-value">${formatDate(user.created_at)}</span>
                    </div>
                </div>`;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        const container = document.getElementById('user_results');
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>An error occurred while loading users. Please try again.</p>
            </div>`;
    }
}

// Session check on page load
(async function() {
    try {
        const res = await fetch('/project-errawrs/src/api/auth/session_check.php', { credentials: 'include' });
        const data = await res.json();
        if (!data.success) {
            window.location.href = '/project-errawrs/public/admin/login.html';
        }
    } catch (e) {
        window.location.href = '/project-errawrs/public/admin/login.html';
    }
})();

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        window.location.reload();
    }
});
class AdminDashboard {
    constructor() {
        this.init();
        // Set up auto-refresh every 5 minutes
        this.setupAutoRefresh();
    }

    init() {
        this.loadAdminInfo();
        this.setupEventListeners();
        this.loadDashboardStats();
        this.setupSidebarToggle();
    }

    setupAutoRefresh() {
        // Refresh dashboard stats every 5 minutes
        setInterval(() => this.loadDashboardStats(), 5 * 60 * 1000);
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

    async loadDashboardStats() {
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
                this.updateDashboardStats(data.stats);
            } else {
                console.error('Failed to load dashboard stats:', data.message);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateDashboardStats(stats) {
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
                this.animateNumber(elements.numberEl, stats[key].count);
                
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

    animateNumber(element, newValue) {
        const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
        const duration = 1000; // Animation duration in milliseconds
        const steps = 60; // Number of steps in animation
        const increment = (newValue - startValue) / steps;
        let currentStep = 0;

        const animation = setInterval(() => {
            currentStep++;
            const currentValue = Math.round(startValue + (increment * currentStep));
            element.textContent = this.formatNumber(currentValue);

            if (currentStep >= steps) {
                clearInterval(animation);
                element.textContent = this.formatNumber(newValue);
            }
        }, duration / steps);
    }

    formatNumber(number) {
        return new Intl.NumberFormat().format(number);
    }

    async handleLogout(e) {
        e.preventDefault();
        
        // Clear session storage
        sessionStorage.clear();
        
        // Redirect to login page
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
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>`;

        // Add to DOM
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

// Form submission
createTellerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validate passwords match
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    const formData = {
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: password
    };

    try {
        const response = await fetch('/project-errawrs/src/api/admin/create_teller.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Update success modal with teller details
            document.getElementById('created_teller_id').textContent = data.teller.teller_number;
            document.getElementById('created_teller_name').textContent = `${data.teller.first_name} ${data.teller.last_name}`;
            
            // Hide create modal and show success modal
            hideModal(createTellerModal);
            showModal(successModal);
            
            // Refresh tellers list
            loadTellers();
            
            // Reset form
            createTellerForm.reset();
        } else {
            alert(data.message || 'Failed to create teller');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating the teller');
    }
});

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
        
        const response = await fetch(`/project-errawrs/src/api/admin/list_tellers.php?${params.toString()}`, {
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
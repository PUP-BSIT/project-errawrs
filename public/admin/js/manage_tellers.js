class TellerManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalTellers = 0;
        this.searchTerm = '';
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTellers();
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('search_teller');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // Create teller button
        const createBtn = document.getElementById('create_teller_btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateModal());
        }

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Save teller
        const saveBtn = document.getElementById('save_btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveTeller());
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancel_btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal(document.getElementById('teller_modal')));
        }

        // Success modal buttons
        const doneBtn = document.getElementById('done_btn');
        const createAnotherBtn = document.getElementById('create_another_btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => this.closeModal(document.getElementById('success_modal')));
        }
        if (createAnotherBtn) {
            createAnotherBtn.addEventListener('click', () => {
                this.closeModal(document.getElementById('success_modal'));
                this.showCreateModal();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout_btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }
    }

    async loadTellers() {
        try {
            const container = document.getElementById('teller_cards');
            if (!container) return;

            container.classList.add('loading');

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                search: this.searchTerm
            });

            const response = await fetch(`/project-errawrs/src/api/admin/list_tellers.php?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tellers: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.totalTellers = data.total || 0;
                this.displayTellers(data.tellers || []);
                this.updatePagination();
            } else {
                throw new Error(data.message || 'Failed to load tellers');
            }
        } catch (error) {
            console.error('Error loading tellers:', error);
            this.showToast('Failed to load tellers. Please try again.', 'error');
        } finally {
            const container = document.getElementById('teller_cards');
            if (container) {
                container.classList.remove('loading');
            }
        }
    }

    displayTellers(tellers) {
        const container = document.getElementById('teller_cards');
        if (!container) return;

        if (tellers.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No tellers found</p>
                </div>`;
            return;
        }

        container.innerHTML = tellers.map(teller => `
            <div class="teller-card">
                <div class="teller-header">
                    <div class="teller-info">
                        <h3>${teller.first_name} ${teller.last_name}</h3>
                        <div class="teller-number">${teller.teller_number || 'No Number Assigned'}</div>
                    </div>
                    <span class="status-badge ${teller.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${teller.status}
                    </span>
                </div>
                <div class="teller-details">
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${teller.email}</span>
                    </div>
                </div>
                <div class="teller-actions">
                    <button class="action-btn" onclick="tellerManager.editTeller(${teller.teller_id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn ${teller.status === 'active' ? 'warning' : 'success'}" 
                            onclick="tellerManager.toggleTellerStatus(${teller.teller_id}, '${teller.status}')" 
                            title="${teller.status === 'active' ? 'Deactivate' : 'Activate'}">
                        <i class="fas fa-power-off"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updatePagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.totalTellers / this.pageSize);
        
        let html = '';
        
        // Previous button
        html += `
            <button ${this.currentPage <= 1 ? 'disabled' : ''} 
                    onclick="tellerManager.changePage(${this.currentPage - 1})">
                Previous
            </button>`;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <button class="${i === this.currentPage ? 'active' : ''}"
                        onclick="tellerManager.changePage(${i})">
                    ${i}
                </button>`;
        }

        // Next button
        html += `
            <button ${this.currentPage >= totalPages ? 'disabled' : ''} 
                    onclick="tellerManager.changePage(${this.currentPage + 1})">
                Next
            </button>`;

        container.innerHTML = html;
    }

    handleSearch(e) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTerm = e.target.value.trim();
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this.loadTellers();
        }, 300);
    }

    showCreateModal() {
        const modal = document.getElementById('teller_modal');
        if (!modal) return;

        // Reset form
        const form = document.getElementById('teller_form');
        if (form) {
            form.reset();
        }

        // Update modal title
        const title = document.getElementById('modal_title');
        if (title) {
            title.textContent = 'Create New Teller';
        }

        // Show modal
        modal.classList.add('show');
    }

    async editTeller(tellerId) {
        try {
            const response = await fetch(`/project-errawrs/src/api/admin/get_teller.php?id=${tellerId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch teller details');
            }

            const data = await response.json();
            
            if (data.success) {
                const modal = document.getElementById('teller_modal');
                const form = document.getElementById('teller_form');
                
                if (modal && form) {
                    // Populate form
                    document.getElementById('teller_id').value = data.teller.teller_id;
                    document.getElementById('first_name').value = data.teller.first_name;
                    document.getElementById('last_name').value = data.teller.last_name;
                    document.getElementById('email').value = data.teller.email;

                    // Update modal title
                    document.getElementById('modal_title').textContent = 'Edit Teller';

                    // Show modal
                    modal.classList.add('show');
                }
            } else {
                throw new Error(data.message || 'Failed to load teller details');
            }
        } catch (error) {
            console.error('Error loading teller details:', error);
            this.showToast(error.message, 'error');
        }
    }

    async saveTeller() {
        try {
            const form = document.getElementById('teller_form');
            if (!form) return;

            const tellerId = document.getElementById('teller_id').value;
            const isEdit = !!tellerId;

            const formData = {
                first_name: document.getElementById('first_name').value,
                last_name: document.getElementById('last_name').value,
                email: document.getElementById('email').value
            };

            if (isEdit) {
                formData.teller_id = tellerId;
            }

            const response = await fetch(`/project-errawrs/src/api/admin/${isEdit ? 'update' : 'create'}_teller.php`, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`Failed to ${isEdit ? 'update' : 'create'} teller`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Close teller modal
                this.closeModal(document.getElementById('teller_modal'));

                // Show success message
                this.showSuccessModal(data.teller, isEdit);

                // Refresh teller list
                this.loadTellers();
            } else {
                throw new Error(data.message || `Failed to ${isEdit ? 'update' : 'create'} teller`);
            }
        } catch (error) {
            console.error('Error saving teller:', error);
            this.showToast(error.message, 'error');
        }
    }

    async toggleTellerStatus(tellerId, currentStatus) {
        try {
            const confirmMessage = currentStatus === 'active' 
                ? 'Are you sure you want to deactivate this teller?' 
                : 'Are you sure you want to activate this teller?';

            if (!confirm(confirmMessage)) {
                return;
            }

            const response = await fetch('/project-errawrs/src/api/admin/toggle_teller_status.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ teller_id: tellerId })
            });

            if (!response.ok) {
                throw new Error(`Failed to update status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.showToast(`Teller ${data.status === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
                await this.loadTellers();
            } else {
                throw new Error(data.message || 'Failed to update teller status');
            }
        } catch (error) {
            console.error('Error toggling teller status:', error);
            this.showToast(error.message, 'error');
        }
    }

    showSuccessModal(teller, isEdit) {
        const modal = document.getElementById('success_modal');
        if (!modal) return;

        // Update success message
        document.getElementById('success_message').textContent = 
            isEdit ? 'Teller updated successfully!' : 'Teller created successfully!';

        // Update teller details
        document.getElementById('success_teller_number').textContent = teller.teller_number;
        document.getElementById('success_teller_name').textContent = `${teller.first_name} ${teller.last_name}`;
        document.getElementById('success_teller_email').textContent = teller.email;

        // Show/hide create another button
        const createAnotherBtn = document.getElementById('create_another_btn');
        if (createAnotherBtn) {
            createAnotherBtn.style.display = isEdit ? 'none' : 'block';
        }

        // Show modal
        modal.classList.add('show');
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
        }
    }

    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        toast.innerHTML = `
            <i class="${this.getToastIcon(type)}"></i>
            <span>${message}</span>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.remove();
            });
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast && toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    getToastIcon(type) {
        switch (type) {
            case 'success':
                return 'fas fa-check-circle';
            case 'error':
                return 'fas fa-exclamation-circle';
            case 'warning':
                return 'fas fa-exclamation-triangle';
            default:
                return 'fas fa-info-circle';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    changePage(page) {
        this.currentPage = page;
        this.loadTellers();
    }

    async handleLogout(e) {
        e.preventDefault();
        
        // Clear session storage
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = '/project-errawrs/public/admin/login.html';
    }

    // Initialize the manager
    static init() {
        window.tellerManager = new TellerManager();
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', TellerManager.init); 
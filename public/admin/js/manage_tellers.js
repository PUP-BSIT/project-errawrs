class TellerManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 6;
        this.totalTellers = 0;
        this.searchTerm = '';
        this.searchTimeout = null;
        this.init();
    }

    getAPIBaseURL() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return '/project-errawrs/src/api';
        } else {
            // For dev-admin.stackovercash.site and other domains
            return '/src/api';
        }
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

        // Reset password modal buttons
        const resetPasswordModal = document.getElementById('reset_password_modal');
        const cancelResetBtn = document.getElementById('cancel_reset_btn');
        const confirmResetBtn = document.getElementById('confirm_reset_btn');
        
        if (cancelResetBtn) {
            cancelResetBtn.addEventListener('click', () => this.closeModal(resetPasswordModal));
        }
        
        // Close modal when clicking close button
        const closeResetBtn = resetPasswordModal?.querySelector('.close-btn');
        if (closeResetBtn) {
            closeResetBtn.addEventListener('click', () => this.closeModal(resetPasswordModal));
        }

        // Status change modal buttons
        const statusModal = document.getElementById('status_change_modal');
        const cancelStatusBtn = document.getElementById('cancel_status_btn');
        const closeStatusBtn = statusModal?.querySelector('.close-btn');
        
        if (cancelStatusBtn) {
            cancelStatusBtn.addEventListener('click', () => this.closeModal(statusModal));
        }
        if (closeStatusBtn) {
            closeStatusBtn.addEventListener('click', () => this.closeModal(statusModal));
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

            const response = await fetch(`${this.getAPIBaseURL()}/admin/list_tellers.php?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tellers: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.totalTellers = data.total || 0;
                // Update total tellers count display
                const totalCountElement = document.getElementById('total_tellers_count');
                if (totalCountElement) {
                    totalCountElement.textContent = this.totalTellers.toLocaleString();
                }
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

        // Sort tellers: pending first, then by status (active/inactive)
        const sortedTellers = [...tellers].sort((a, b) => {
            // If a is pending and b is not, a comes first
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            // If b is pending and a is not, b comes first
            if (b.status === 'pending' && a.status !== 'pending') return 1;
            // If both are pending or both are not pending, sort by status
            if (a.status === b.status) return 0;
            // Active comes before inactive
            return a.status === 'active' ? -1 : 1;
        });

        container.innerHTML = sortedTellers.map(teller => `
            <div class="teller-card">
                <div class="teller-header">
                    <div class="teller-info">
                        <h3>${teller.first_name} ${teller.last_name}</h3>
                        <div class="teller-number">${teller.teller_number || 'No Number Assigned'}</div>
                    </div>
                    <span class="status-badge ${teller.status === 'active' ? 'status-active' : 
                        teller.status === 'pending' ? 'status-pending' : 'status-inactive'}">
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
                    <button class="action-btn" onclick="tellerManager.resetPassword(${teller.teller_id})" title="Reset Password">
                        <i class="fas fa-key"></i>
                    </button>
                    ${teller.status !== 'pending' ? `
                        <button class="action-btn ${teller.status === 'active' ? 'warning' : 'success'}" 
                                onclick="tellerManager.toggleTellerStatus(${teller.teller_id}, '${teller.status}')" 
                                title="${teller.status === 'active' ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-power-off"></i>
                        </button>
                    ` : `
                        <button class="action-btn success" 
                                onclick="tellerManager.toggleTellerStatus(${teller.teller_id}, 'pending')" 
                                title="Activate">
                            <i class="fas fa-power-off"></i>
                        </button>
                    `}
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
            <button class="pagination-btn" ${this.currentPage <= 1 ? 'disabled' : ''} 
                    onclick="tellerManager.changePage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
                Previous
            </button>`;

        // Page numbers with ellipsis
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (startPage > 1) {
            html += `<button onclick="tellerManager.changePage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}"
                        onclick="tellerManager.changePage(${i})">
                    ${i}
                </button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
            html += `<button onclick="tellerManager.changePage(${totalPages})">${totalPages}</button>`;
        }

        // Next button
        html += `
            <button class="pagination-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} 
                    onclick="tellerManager.changePage(${this.currentPage + 1})">
                Next
                <i class="fas fa-chevron-right"></i>
            </button>`;
        
        container.innerHTML = html;
    }

    handleSearch(e) {
        clearTimeout(this.searchTimeout);
        this.searchTerm = e.target.value.trim();
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this.loadTellers();
        }, 300); // Debounce search
    }

    showCreateModal() {
        const modal = document.getElementById('teller_modal');
        const form = document.getElementById('teller_form');
        const modalTitle = document.getElementById('modal_title');
        const saveBtn = document.getElementById('save_btn');

        form.reset();
        form.dataset.tellerId = '';
        modalTitle.textContent = 'Create New Teller';
        saveBtn.textContent = 'Create Teller';
        modal.style.display = 'block';
    }

    async editTeller(tellerId) {
        try {
            const response = await fetch(`${this.getAPIBaseURL()}/admin/get_teller.php?id=${tellerId}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success && data.teller) {
                const teller = data.teller;
                const modal = document.getElementById('teller_modal');
                const form = document.getElementById('teller_form');
                const modalTitle = document.getElementById('modal_title');
                const saveBtn = document.getElementById('save_btn');

                form.dataset.tellerId = teller.teller_id;
                document.getElementById('first_name').value = teller.first_name;
                document.getElementById('last_name').value = teller.last_name;
                document.getElementById('email').value = teller.email;
                document.getElementById('phone_number').value = teller.phone_number;
                // document.getElementById('password').value = ''; // Don't pre-fill password for security
                // document.getElementById('confirm_password').value = ''; // Don't pre-fill password for security

                // Hide password fields for edit
                document.getElementById('password_group').style.display = 'none';
                document.getElementById('confirm_password_group').style.display = 'none';

                modalTitle.textContent = 'Edit Teller';
                saveBtn.textContent = 'Save Changes';
                modal.style.display = 'block';
            } else {
                this.showToast(data.message || 'Teller not found.', 'error');
            }
        } catch (error) {
            console.error('Error fetching teller for edit:', error);
            this.showToast('Failed to load teller data for editing.', 'error');
        }
    }

    async saveTeller() {
        const form = document.getElementById('teller_form');
        const tellerId = form.dataset.tellerId;
        const isEdit = !!tellerId;

        const firstName = document.getElementById('first_name').value.trim();
        const lastName = document.getElementById('last_name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phoneNumber = document.getElementById('phone_number').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        if (!firstName || !lastName || !email || !phoneNumber) {
            this.showToast('Please fill in all required fields.', 'error');
            return;
        }

        if (!isEdit && (!password || !confirmPassword)) {
            this.showToast('Please set a password for the new teller.', 'error');
            return;
        }

        if (!isEdit && password !== confirmPassword) {
            this.showToast('Passwords do not match.', 'error');
            return;
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showToast('Please enter a valid email address.', 'error');
            return;
        }

        const url = isEdit 
            ? `${this.getAPIBaseURL()}/admin/update_teller.php`
            : `${this.getAPIBaseURL()}/admin/create_teller.php`;

        const method = 'POST';
        const body = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone_number: phoneNumber
        };

        if (!isEdit) {
            body.password = password;
        } else {
            body.teller_id = tellerId;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(`Teller ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                this.closeModal(document.getElementById('teller_modal'));
                this.loadTellers(); // Reload tellers to show the new one
                this.showSuccessModal(data.teller, isEdit);
            } else {
                this.showToast(data.message || `Failed to ${isEdit ? 'update' : 'create'} teller.`, 'error');
            }
        } catch (error) {
            console.error(`Error ${isEdit ? 'updating' : 'creating'} teller:`, error);
            this.showToast(`An error occurred while ${isEdit ? 'updating' : 'creating'} the teller.`, 'error');
        }
    }

    async resetPassword(tellerId) {
        const resetPasswordModal = document.getElementById('reset_password_modal');
        const confirmResetBtn = document.getElementById('confirm_reset_btn');
        const newPasswordInput = document.getElementById('new_password');
        const confirmNewPasswordInput = document.getElementById('confirm_new_password');
        
        if (!resetPasswordModal || !confirmResetBtn || !newPasswordInput || !confirmNewPasswordInput) {
            console.error('Reset password modal elements not found.');
            return;
        }

        resetPasswordModal.style.display = 'block';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';

        const handleConfirm = async () => {
            const newPassword = newPasswordInput.value;
            const confirmNewPassword = confirmNewPasswordInput.value;

            if (!newPassword || !confirmNewPassword) {
                this.showToast('Please enter and confirm the new password.', 'error');
                return;
            }

            if (newPassword !== confirmNewPassword) {
                this.showToast('New passwords do not match.', 'error');
                return;
            }

            try {
                const response = await fetch(`${this.getAPIBaseURL()}/admin/reset_teller_password.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ teller_id: tellerId, new_password: newPassword }),
                    credentials: 'include'
                });

                const data = await response.json();

                if (data.success) {
                    this.showToast('Password reset successfully!', 'success');
                    this.closeModal(resetPasswordModal);
                } else {
                    this.showToast(data.message || 'Failed to reset password.', 'error');
                }
            } catch (error) {
                console.error('Error resetting password:', error);
                this.showToast('An error occurred while resetting the password.', 'error');
            }
            confirmResetBtn.removeEventListener('click', handleConfirm); // Prevent multiple calls
        };

        confirmResetBtn.addEventListener('click', handleConfirm);
    }

    async toggleTellerStatus(tellerId, currentStatus) {
        const statusChangeModal = document.getElementById('status_change_modal');
        const statusMessage = document.getElementById('status_change_message');
        const confirmStatusBtn = document.getElementById('confirm_status_btn');
        
        if (!statusChangeModal || !statusMessage || !confirmStatusBtn) {
            console.error('Status change modal elements not found.');
            return;
        }

        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        statusMessage.textContent = `Are you sure you want to change the teller's status to "${newStatus}"?`;
        confirmStatusBtn.textContent = `Confirm ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;
        statusChangeModal.style.display = 'block';

        const handleConfirm = async () => {
            try {
                const response = await fetch(`${this.getAPIBaseURL()}/admin/update_teller_status.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ teller_id: tellerId, status: newStatus }),
                    credentials: 'include'
                });

                const data = await response.json();

                if (data.success) {
                    this.showToast(`Teller status changed to ${newStatus} successfully!`, 'success');
                    this.closeModal(statusChangeModal);
                    this.loadTellers(); // Reload tellers to reflect status change
                } else {
                    this.showToast(data.message || 'Failed to change teller status.', 'error');
                }
            } catch (error) {
                console.error('Error changing teller status:', error);
                this.showToast('An error occurred while changing teller status.', 'error');
            }
            confirmStatusBtn.removeEventListener('click', handleConfirm); // Prevent multiple calls
        };

        confirmStatusBtn.addEventListener('click', handleConfirm);
    }

    showSuccessModal(teller, isEdit) {
        const successModal = document.getElementById('success_modal');
        const successTitle = document.getElementById('success_modal_title');
        const successMessage = document.getElementById('success_modal_message');
        const tellerDetailsDiv = document.getElementById('teller_details_display');

        if (!successModal || !successTitle || !successMessage || !tellerDetailsDiv) {
            console.error('Success modal elements not found.');
            return;
        }

        successTitle.textContent = isEdit ? 'Teller Updated Successfully!' : 'Teller Created Successfully!';
        successMessage.textContent = isEdit 
            ? 'The teller\'s information has been updated.' 
            : 'A new teller account has been created.';
        
        tellerDetailsDiv.innerHTML = `
            <p><strong>Name:</strong> ${teller.first_name} ${teller.last_name}</p>
            <p><strong>Email:</strong> ${teller.email}</p>
            ${teller.teller_number ? `<p><strong>Teller Number:</strong> ${teller.teller_number}</p>` : ''}
            ${!isEdit ? `<p class="temp-password-note">Please provide them with their temporary password.</p>` : ''}
        `;
        successModal.style.display = 'block';
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = this.getToastIcon(type);

        toast.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;

        if (toastContainer) {
            toastContainer.appendChild(toast);
        } else {
            document.body.appendChild(toast);
            console.warn('Toast container not found, appending toast to body.');
        }

        setTimeout(() => toast.remove(), 3000);

        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => toast.remove());
        }
    }

    getToastIcon(type) {
        switch(type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'info': return 'fas fa-info-circle';
            default: return 'fas fa-info-circle';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    changePage(page) {
        this.currentPage = page;
        this.loadTellers();
    }

    async handleLogout(e) {
        e.preventDefault();
        try {
            const response = await fetch(`${this.getAPIBaseURL()}/auth/logout.php`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.showToast('Logged out successfully!', 'success');
                setTimeout(() => window.location.href = 'login.html', 1000);
            } else {
                this.showToast(data.message || 'Logout failed.', 'error');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            this.showToast('An error occurred during logout.', 'error');
        }
    }

    static init() {
        new TellerManager();
    }
}

TellerManager.init();
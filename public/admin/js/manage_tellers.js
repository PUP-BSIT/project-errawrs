class TellerManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.allTellers = [];
        this.filteredTellers = [];

        // DOM Elements
        this.tellerCardsContainer = document.getElementById('teller_cards');
        this.paginationContainer = document.getElementById('pagination');
        this.searchTellerInput = document.getElementById('search_teller');
        this.tellerForm = document.getElementById('teller_form');
        this.addTellerBtn = document.getElementById('add_teller_btn');
        this.editTellerModal = new bootstrap.Modal(document.getElementById('editTellerModal'));
        this.editTellerForm = document.getElementById('edit_teller_form');
        this.editTellerIdInput = document.getElementById('edit_teller_id');
        this.editFirstNameInput = document.getElementById('edit_first_name');
        this.editLastNameInput = document.getElementById('edit_last_name');
        this.editUsernameInput = document.getElementById('edit_username');
        this.editStatusSelect = document.getElementById('edit_status');
        this.resetPasswordBtn = document.getElementById('reset_password_btn');
        this.confirmResetPasswordBtn = document.getElementById('confirm_reset_password_btn');
        this.resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
        this.currentTellerToReset = null;

        // Ensure critical elements exist
        if (!this.tellerCardsContainer || !this.paginationContainer || !this.searchTellerInput || !this.tellerForm || !this.addTellerBtn) {
            console.error('Critical DOM elements for TellerManager not found. Stopping script.');
            return; // Stop if critical elements are missing
        }

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
        this.loadTellers();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchTellerInput.addEventListener('input', () => this.handleSearch());
        this.addTellerBtn.addEventListener('click', () => this.showAddTellerModal());
        this.tellerForm.addEventListener('submit', (e) => this.handleTellerFormSubmit(e));
        this.editTellerForm.addEventListener('submit', (e) => this.handleEditTellerFormSubmit(e));
        this.resetPasswordBtn.addEventListener('click', () => this.showResetPasswordConfirmation());
        this.confirmResetPasswordBtn.addEventListener('click', () => this.resetTellerPassword());
    }

    async loadTellers() {
        this.tellerCardsContainer.classList.add('loading');
        try {
            const response = await fetch(`${this.getAPIBaseURL()}/admin/list_tellers.php`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch tellers');
            }

            this.allTellers = data.list;
            this.sortTellers(); // Sort them after fetching
            this.filterAndRenderTellers();
            this.showToast('Tellers loaded successfully', 'success');

        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
            this.renderNoResults();
        } finally {
            this.tellerCardsContainer.classList.remove('loading');
        }
    }

    sortTellers() {
        this.allTellers.sort((a, b) => {
            // Inactive tellers first
            if (a.status !== b.status) {
                return a.status === 'inactive' ? -1 : 1;
            }
            // Then by creation date (newest first)
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }

    filterAndRenderTellers() {
        const searchTerm = this.searchTellerInput.value.toLowerCase();
        this.filteredTellers = this.allTellers.filter(teller =>
            `${teller.first_name} ${teller.last_name}`.toLowerCase().includes(searchTerm) ||
            teller.username.toLowerCase().includes(searchTerm) ||
            teller.teller_id.toString().includes(searchTerm)
        );
        this.currentPage = 1; // Reset to first page on new search/filter
        this.renderTellers();
        this.renderPagination();
    }

    renderTellers() {
        if (!this.tellerCardsContainer) {
            console.error('tellerCardsContainer is null. Cannot render tellers.');
            return;
        }

        this.tellerCardsContainer.innerHTML = '';
        if (this.filteredTellers.length === 0) {
            this.renderNoResults();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const tellersToShow = this.filteredTellers.slice(startIndex, endIndex);

        this.tellerCardsContainer.style.gridTemplateColumns = tellersToShow.length === 1
            ? 'minmax(300px, 400px)'
            : 'repeat(auto-fit, minmax(300px, 1fr))';


        tellersToShow.forEach(teller => {
            const card = document.createElement('div');
            card.className = 'teller-card';
            card.innerHTML = `
                <div class="teller-header">
                    <div class="teller-info">
                        <h3>${teller.first_name} ${teller.last_name}</h3>
                        <div class="teller-id">Teller ID: ${teller.teller_id}</div>
                    </div>
                    <span class="status-badge status-${teller.status}">${teller.status}</span>
                </div>
                <div class="teller-details">
                    <div class="detail-row">
                        <span class="detail-label">Username:</span>
                        <span class="detail-value">${teller.username}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${new Date(teller.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="teller-actions">
                    <button class="btn btn-sm btn-primary edit-teller-btn" data-id="${teller.teller_id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-teller-btn" data-id="${teller.teller_id}" data-username="${teller.username}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
            this.tellerCardsContainer.appendChild(card);
        });

        this.tellerCardsContainer.querySelectorAll('.edit-teller-btn').forEach(button => {
            button.addEventListener('click', (e) => this.showEditTellerModal(e.currentTarget.dataset.id));
        });

        this.tellerCardsContainer.querySelectorAll('.delete-teller-btn').forEach(button => {
            button.addEventListener('click', (e) => this.confirmDeleteTeller(e.currentTarget.dataset.id, e.currentTarget.dataset.username));
        });
    }

    renderPagination() {
        this.paginationContainer.innerHTML = '';
        this.totalPages = Math.ceil(this.filteredTellers.length / this.itemsPerPage);

        if (this.totalPages <= 1) return;

        // Previous button
        const prevBtn = this.createPaginationButton('Previous', this.currentPage === 1, () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTellers();
                this.renderPagination();
            }
        });
        this.paginationContainer.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            const pageBtn = this.createPaginationButton(i, i === this.currentPage, () => {
                this.currentPage = i;
                this.renderTellers();
                this.renderPagination();
            });
            if (i === this.currentPage) pageBtn.classList.add('active');
            this.paginationContainer.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = this.createPaginationButton('Next', this.currentPage === this.totalPages, () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.renderTellers();
                this.renderPagination();
            }
        });
        this.paginationContainer.appendChild(nextBtn);
    }

    createPaginationButton(text, disabled, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        return button;
    }

    handleSearch() {
        this.filterAndRenderTellers();
    }

    renderNoResults() {
        this.tellerCardsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No tellers found</p>
            </div>
        `;
    }

    showAddTellerModal() {
        this.tellerForm.reset();
        document.getElementById('addTellerModalLabel').textContent = 'Add New Teller';
        // Hide password fields as they are for adding, not editing
        document.getElementById('add_password_group').style.display = 'block';
        document.getElementById('add_confirm_password_group').style.display = 'block';

        const addTellerModal = new bootstrap.Modal(document.getElementById('addTellerModal'));
        addTellerModal.show();
    }

    async handleTellerFormSubmit(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('first_name').value.trim();
        const lastName = document.getElementById('last_name').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        if (!firstName || !lastName || !username || !password || !confirmPassword) {
            this.showToast('Please fill in all fields.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match.', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.getAPIBaseURL()}/admin/add_teller.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    username: username,
                    password: password
                }),
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to add teller');
            }

            this.showToast('Teller added successfully!', 'success');
            const addTellerModal = bootstrap.Modal.getInstance(document.getElementById('addTellerModal'));
            addTellerModal.hide();
            this.loadTellers(); // Reload tellers to show the new one
        } catch (error) {
            this.showToast(`Error adding teller: ${error.message}`, 'error');
        }
    }

    showEditTellerModal(tellerId) {
        this.currentTellerToReset = tellerId; // Store for password reset
        const teller = this.allTellers.find(t => t.teller_id == tellerId);
        if (teller) {
            this.editTellerIdInput.value = teller.teller_id;
            this.editFirstNameInput.value = teller.first_name;
            this.editLastNameInput.value = teller.last_name;
            this.editUsernameInput.value = teller.username;
            this.editStatusSelect.value = teller.status;
            this.editTellerModal.show();
        } else {
            this.showToast('Teller not found.', 'error');
        }
    }

    async handleEditTellerFormSubmit(e) {
        e.preventDefault();
        const tellerId = this.editTellerIdInput.value;
        const firstName = this.editFirstNameInput.value.trim();
        const lastName = this.editLastNameInput.value.trim();
        const username = this.editUsernameInput.value.trim();
        const status = this.editStatusSelect.value;

        if (!firstName || !lastName || !username || !status) {
            this.showToast('Please fill in all fields.', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.getAPIBaseURL()}/admin/update_teller.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teller_id: tellerId,
                    first_name: firstName,
                    last_name: lastName,
                    username: username,
                    status: status
                }),
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update teller');
            }

            this.showToast('Teller updated successfully!', 'success');
            this.editTellerModal.hide();
            this.loadTellers(); // Reload tellers to show updated info
        } catch (error) {
            this.showToast(`Error updating teller: ${error.message}`, 'error');
        }
    }

    confirmDeleteTeller(tellerId, username) {
        if (confirm(`Are you sure you want to delete teller "${username}" (ID: ${tellerId})? This action cannot be undone.`)) {
            this.deleteTeller(tellerId);
        }
    }

    async deleteTeller(tellerId) {
        try {
            const response = await fetch(`${this.getAPIBaseURL()}/admin/delete_teller.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teller_id: tellerId }),
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to delete teller');
            }

            this.showToast('Teller deleted successfully!', 'success');
            this.loadTellers(); // Reload tellers after deletion
        } catch (error) {
            this.showToast(`Error deleting teller: ${error.message}`, 'error');
        }
    }

    showResetPasswordConfirmation() {
        this.editTellerModal.hide(); // Hide edit modal first
        if (this.currentTellerToReset) {
            // You might want to display the username of the teller being reset here
            // e.g., document.getElementById('reset_teller_username').textContent = teller.username;
            this.resetPasswordModal.show();
        }
    }

    async resetTellerPassword() {
        if (!this.currentTellerToReset) {
            this.showToast('No teller selected for password reset.', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.getAPIBaseURL()}/admin/reset_teller_password.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teller_id: this.currentTellerToReset }),
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to reset password');
            }

            this.showToast('Password reset successfully! New password displayed in console (for testing only).', 'success');
            console.log('New Password:', data.new_password); // Display new password for admin
            this.resetPasswordModal.hide();
            this.currentTellerToReset = null; // Clear selection
        } catch (error) {
            this.showToast(`Error resetting password: ${error.message}`, 'error');
        }
    }

    showToast(message, type) {
        const toastContainer = document.querySelector('.toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass;
        switch(type) {
            case 'success': iconClass = 'fas fa-check-circle'; break;
            case 'error': iconClass = 'fas fa-exclamation-circle'; break;
            default: iconClass = 'fas fa-info-circle';
        }

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
}

document.addEventListener('DOMContentLoaded', () => {
    new TellerManager();
});
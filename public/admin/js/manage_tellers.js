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
        this.addTellerBtn = document.getElementById('create_teller_btn');
        this.addEditTellerModal = new bootstrap.Modal(document.getElementById('teller_modal'));
        this.editTellerForm = document.getElementById('teller_form');
        this.editTellerIdInput = document.getElementById('teller_id');
        this.editFirstNameInput = document.getElementById('first_name');
        this.editLastNameInput = document.getElementById('last_name');
        this.editUsernameInput = document.getElementById('email');
        this.editStatusSelect = document.getElementById('edit_status');
        this.resetPasswordBtn = document.getElementById('reset_password_btn');
        this.confirmResetPasswordBtn = document.getElementById('confirm_reset_password_btn');
        this.resetPasswordModal = new bootstrap.Modal(document.getElementById('reset_password_modal'));
        this.currentTellerToReset = null;

        // Ensure critical elements exist
        if (!this.tellerCardsContainer || !this.paginationContainer || !this.searchTellerInput || !this.tellerForm || !this.addTellerBtn) {
            console.error('Critical DOM elements for TellerManager not found. Stopping script.');
            return; // Stop if critical elements are missing
        }
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
        console.log('loadTellers() called.'); // Debug log
        this.tellerCardsContainer.classList.add('loading');
        try {
            const apiURL = `${this.getAPIBaseURL()}/admin/list_tellers.php`;
            console.log(`Fetching tellers from: ${apiURL}`); // Debug log

            const response = await fetch(apiURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            console.log(`Response status: ${response.status}, OK: ${response.ok}`); // Debug log

            const data = await response.json();
            console.log('API Response data:', data); // Debug log

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch tellers');
            }

            this.allTellers = data.tellers;
            this.sortTellers(); // Sort them after fetching
            this.filterAndRenderTellers();
            this.showToast('Tellers loaded successfully', 'success');

        } catch (error) {
            console.error('Error in loadTellers:', error); // Enhanced error log
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
        document.getElementById('modal_title').textContent = 'Add New Teller';
        this.addEditTellerModal.show();
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
            const addTellerModal = bootstrap.Modal.getInstance(document.getElementById('teller_modal'));
            addTellerModal.hide();
            this.loadTellers(); // Reload tellers to show the new one
        } catch (error) {
            this.showToast(`Error adding teller: ${error.message}`, 'error');
        }
    }

    async showEditTellerModal(tellerId) {
        const teller = this.allTellers.find(t => t.teller_id == tellerId);
        if (teller) {
            document.getElementById('modal_title').textContent = 'Edit Teller';
            this.editTellerIdInput.value = teller.teller_id;
            this.editFirstNameInput.value = teller.first_name;
            this.editLastNameInput.value = teller.last_name;
            this.editUsernameInput.value = teller.username;
            if (this.editStatusSelect) {
                this.editStatusSelect.value = teller.status;
            }
            if (document.getElementById('add_password_group')) {
                document.getElementById('add_password_group').style.display = 'none';
            }
            if (document.getElementById('add_confirm_password_group')) {
                document.getElementById('add_confirm_password_group').style.display = 'none';
            }
            this.addEditTellerModal.show();
        } else {
            this.showToast('Teller not found for editing', 'error');
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
            this.addEditTellerModal.hide();
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
        this.addEditTellerModal.hide(); // Hide edit modal first
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
        if (!toastContainer) {
            console.error('Toast container not found.');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        // Animate the toast in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10); // Small delay to allow CSS transition

        // Animate the toast out and remove after a delay
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TellerManager();
});
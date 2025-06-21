class RegistrationReview {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 2; // Always 2 per page
        this.currentStatus = 'pending';
        this.allRegistrations = [];
        this.filteredRegistrations = [];
        this.setupEventListeners();
        this.loadRegistrations();
    }

    // Configuration - Dynamic base URL detection
    getBaseURL() {
        const protocol = window.location.protocol;
        const host = window.location.host;
        
        // Check if we're on the EC2 server
        if (host === 'dev-teller.stackovercash.site') {
            return `${protocol}//${host}/api`;
        }
        
        // Local XAMPP environment
        return `${protocol}//${host}/project-errawrs/src/api`;
    }

    setupEventListeners() {
        // Status filter
        const statusFilter = document.getElementById('status_filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentStatus = statusFilter.value;
                this.currentPage = 1;
                this.loadRegistrations();
            });
        }

        // Search box
        const searchBox = document.getElementById('search_box');
        if (searchBox) {
            searchBox.addEventListener('input', () => {
                this.currentPage = 1;
                this.applySearchFilter();
                this.displayRegistrations(this.getPaginatedRegistrations());
                this.updatePagination();
            });
        }

        // Modal close button
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                document.getElementById('application_modal').style.display = '';
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('application_modal');
            if (e.target === modal) {
                modal.style.display = '';
            }
        });
    }

    async loadRegistrations() {
        try {
            const baseUrl = this.getBaseURL();
            const url = new URL(`${baseUrl}/teller/get_registrations.php`);
            url.searchParams.append('status', this.currentStatus);
            // Fetch all registrations for search and pagination
            url.searchParams.append('page', 1);
            url.searchParams.append('per_page', 1000);
            const response = await fetch(url, { credentials: 'include' });
            if (response.status === 403) {
                window.location.href = './bank_teller_login.html';
                return;
            }
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch registrations: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Unknown error occurred');
            }
            this.allRegistrations = data.registrations;
            this.applySearchFilter();
            this.displayRegistrations(this.getPaginatedRegistrations());
            this.updatePagination();
        } catch (error) {
            this.showNotification(error.message, 'error');
            const container = document.querySelector('.applications-grid');
            if (container) {
                container.innerHTML = `
                    <div class="no-applications">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading applications. Please try again.</p>
                    </div>
                `;
            }
        }
    }

    applySearchFilter() {
        const searchBox = document.getElementById('search_box');
        const query = searchBox ? searchBox.value.trim().toLowerCase() : '';
        if (!query) {
            this.filteredRegistrations = this.allRegistrations;
        } else {
            this.filteredRegistrations = this.allRegistrations.filter(reg => {
                return (
                    (reg.account_number && reg.account_number.toLowerCase().includes(query)) ||
                    (reg.first_name && reg.first_name.toLowerCase().includes(query)) ||
                    (reg.last_name && reg.last_name.toLowerCase().includes(query))
                );
            });
        }
    }

    getPaginatedRegistrations() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredRegistrations.slice(start, end);
    }

    displayRegistrations(registrations) {
        const container = document.querySelector('.applications-grid');
        if (!container) return;
        if (!registrations.length) {
            container.innerHTML = `
                <div class="no-applications">
                    <i class="fas fa-inbox fa-3x"></i>
                    <p>No ${this.currentStatus === 'all' ? '' : this.currentStatus} applications found</p>
                    ${this.currentStatus !== 'pending' ? `
                        <button class="btn view-pending" onclick="registrationReview.viewPending()">
                            <i class="fas fa-clock"></i> View Pending Applications
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        const html = registrations.map(reg => `
            <div class="registration-card" 
                 data-registration-id="${reg.registration_id}"
                 data-dob="${reg.date_of_birth}"
                 data-street="${reg.street_address || ''}"
                 data-city="${reg.city || ''}"
                 data-country="${reg.country || ''}"
                 data-zip-code="${reg.zip_code || ''}"
                 data-id-image="${reg.id_image || ''}"
            >
                <div class="card-left">
                <div class="registration-header">
                        <div class="applicant-info">
                            <h3 class="applicant-name">${reg.first_name} ${reg.last_name}</h3>
                            <div class="meta-info">
                                <span class="application-date" title="Application Date">
                                    <i class="far fa-calendar-alt"></i>
                                    ${new Date(reg.created_at).toLocaleDateString()}
                                </span>
                                <span class="application-id" title="Application ID">
                                    <i class="fas fa-hashtag"></i>
                                    ${reg.registration_id}
                                </span>
                            </div>
                        </div>
                </div>

                <div class="registration-details">
                        <div class="detail-row">
                            <div class="detail-item email">
                                <i class="far fa-envelope"></i>
                                <span>${reg.email}</span>
                            </div>
                            <div class="detail-item phone">
                                <i class="fas fa-phone"></i>
                                <span>${reg.phone_number}</span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-item id-type">
                                <i class="fas fa-id-card"></i>
                                <span>${reg.id_type}</span>
                            </div>
                            <div class="detail-item nationality">
                                <i class="fas fa-globe"></i>
                                <span>${reg.nationality}</span>
                            </div>
                        </div>
                        ${reg.status !== 'pending' ? `
                            <div class="update-info">
                                <i class="far fa-clock"></i>
                                Last updated ${this.getTimeAgo(new Date(reg.updated_at))}
                            </div>
                        ` : ''}
                </div>

                    <button class="btn btn-view" onclick="registrationReview.viewDetails(${reg.registration_id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>

                <div class="card-right">
                    <div class="status-section">
                        <div class="status-badge ${reg.status}" title="Application Status">
                            <i class="fas ${
                                reg.status === 'pending' ? 'fa-clock' :
                                reg.status === 'approved' ? 'fa-check-circle' :
                                'fa-times-circle'
                            }"></i>
                            ${reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                        </div>
                        
                        ${reg.status === 'pending' ? `
                            <div class="action-buttons">
                                <button class="btn btn-deny" onclick="registrationReview.handleAction(${reg.registration_id}, 'deny')"
                                        title="Deny Application">
                        <i class="fas fa-times"></i> Deny
                    </button>
                                <button class="btn btn-approve" onclick="registrationReview.handleAction(${reg.registration_id}, 'approve')"
                                        title="Approve Application">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        container.innerHTML = html;
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredRegistrations.length / this.itemsPerPage) || 1;
        const pageNumbers = document.getElementById('page-numbers');
        if (pageNumbers) {
            let html = '';
            for (let i = 1; i <= totalPages; i++) {
                html += `
                    <button class="page-number ${i === this.currentPage ? 'active' : ''}"
                            onclick="registrationReview.goToPage(${i})">
                        ${i}
                    </button>
                `;
            }
            pageNumbers.innerHTML = html;
        }
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
    }

    async viewDetails(registrationId) {
        try {
            const card = document.querySelector(`[data-registration-id="${registrationId}"]`);
            if (!card) {
                throw new Error('Registration card not found');
            }

            // Hide the filter section and applications grid
            document.querySelector('.filter-section').style.display = 'none';
            document.querySelector('.applications-grid').style.display = 'none';
            document.querySelector('.pagination-container').style.display = 'none';

            // Create and show the details view
            const detailsContainer = document.createElement('div');
            detailsContainer.className = 'registration-details-view';
            
            const details = {
                id: registrationId,
                name: card.querySelector('.applicant-name')?.textContent || 'N/A',
                email: card.querySelector('.email span')?.textContent || 'N/A',
                phone: card.querySelector('.phone span')?.textContent || 'N/A',
                idType: card.querySelector('.id-type span')?.textContent || 'N/A',
                nationality: card.querySelector('.nationality span')?.textContent || 'N/A',
                status: card.querySelector('.status-badge')?.textContent?.toLowerCase().trim() || 'pending',
                createdAt: card.querySelector('.application-date')?.textContent?.trim() || 'N/A',
                updatedAt: card.querySelector('.update-info')?.textContent?.trim() || 'Not reviewed yet'
            };

            detailsContainer.innerHTML = `
                <div class="details-header">
                    <button class="btn btn-back" onclick="registrationReview.goBack()">
                        <i class="fas fa-arrow-left"></i> Back to Applications
                    </button>
                    <div class="status-badge ${details.status}">
                        <i class="fas ${
                            details.status === 'pending' ? 'fa-clock' :
                            details.status === 'approved' ? 'fa-check-circle' :
                            'fa-times-circle'
                        }"></i>
                        ${details.status.charAt(0).toUpperCase() + details.status.slice(1)}
                    </div>
                </div>

                <div class="details-content">
                    <div class="details-main">
                        <div class="section">
                            <h2>Personal Information</h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label><i class="fas fa-user"></i> Full Name</label>
                                    <span>${details.name}</span>
                                </div>
                                <div class="info-item">
                                    <label><i class="far fa-envelope"></i> Email Address</label>
                                    <span>${details.email}</span>
                                </div>
                                <div class="info-item">
                                    <label><i class="fas fa-phone"></i> Phone Number</label>
                                    <span>${details.phone}</span>
                                </div>
                                <div class="info-item">
                                    <label><i class="fas fa-calendar"></i> Date of Birth</label>
                                    <span>${new Date(card.dataset.dob).toLocaleDateString()}</span>
                                </div>
                                <div class="info-item">
                                    <label><i class="fas fa-globe"></i> Nationality</label>
                                    <span>${details.nationality}</span>
                                </div>
                            </div>
                        </div>

                        <div class="section">
                            <h2>Address Information</h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label><i class="fas fa-map-marker-alt"></i> Street Address</label>
                                    <span>${card.dataset.street}</span>
                                </div>
                                <div class="info-item">
                                    <label><i class="fas fa-city"></i> City</label>
                                    <span>${card.dataset.city}</span>
                                </div>
                                <div class="info-item">
                                    <label><i class="fas fa-map"></i> Country</label>
                                    <span>${card.dataset.country}</span>
                                </div>
                                <div class="info-item">
                                    <label><i class="fas fa-mail-bulk"></i> ZIP Code</label>
                                    <span>${card.dataset.zipCode}</span>
                                </div>
                            </div>
                        </div>

                        <div class="section">
                            <h2>ID Document</h2>
                            <div class="id-preview-section">
                                <div class="id-preview-container">
                                    <img src="${card.dataset.idImage}" alt="ID Document" class="id-preview-image">
                                </div>
                                <div class="id-preview-note">
                                    <i class="fas fa-search-plus"></i>
                                    Click to zoom
                                </div>
                            </div>
                        </div>

                        ${details.status === 'pending' ? `
                            <div class="section">
                                <h2>Actions</h2>
                                <div class="details-actions">
                                    <button class="btn btn-approve" onclick="registrationReview.approveRegistration('${details.id}')">
                                        <i class="fas fa-check"></i> Approve Application
                                    </button>
                                    <button class="btn btn-deny" onclick="registrationReview.rejectRegistration('${details.id}')">
                                        <i class="fas fa-times"></i> Reject Application
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            // Add the details view to the page
            document.querySelector('.main-content').appendChild(detailsContainer);

        } catch (error) {
            console.error('Error in viewDetails:', error);
            this.showNotification('Error loading application details', 'error');
        }
    }

    goBack() {
        // Remove the details view
        const detailsView = document.querySelector('.registration-details-view');
        if (detailsView) {
            detailsView.remove();
        }

        // Show the filter section and applications grid
        document.querySelector('.filter-section').style.display = 'flex';
        document.querySelector('.applications-grid').style.display = 'grid';
        document.querySelector('.pagination-container').style.display = 'flex';
    }

    viewPending() {
        this.currentStatus = 'pending';
        this.currentPage = 1;
        this.loadRegistrations();
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + ' years ago';
        if (interval === 1) return 'a year ago';
        
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return interval + ' months ago';
        if (interval === 1) return 'a month ago';
        
        interval = Math.floor(seconds / 86400);
        if (interval > 1) return interval + ' days ago';
        if (interval === 1) return 'yesterday';
        
        interval = Math.floor(seconds / 3600);
        if (interval > 1) return interval + ' hours ago';
        if (interval === 1) return 'an hour ago';
        
        interval = Math.floor(seconds / 60);
        if (interval > 1) return interval + ' minutes ago';
        if (interval === 1) return 'a minute ago';
        
        return 'just now';
    }

    async handleAction(registrationId, action) {
        try {
            const confirmed = await this.confirmAction(action);
            if (!confirmed) return;

            console.log(`Processing ${action} for registration ${registrationId}`);

            const response = await fetch(`${this.getBaseURL()}/teller/review_registration.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    registration_id: registrationId,
                    action: action
                })
            });

            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Error parsing response:', e);
                console.error('Raw response:', responseText);
                throw new Error('Invalid response from server: ' + responseText.substring(0, 100));
            }

            if (!response.ok || !data.success) {
                const errorMessage = data.error || data.details || 'Failed to process registration';
                console.error('Server error:', data);
                throw new Error(errorMessage);
            }

            // Close modals
            this.closeConfirmationModal();
            document.getElementById('application_modal').style.display = 'none';

            // Show success message
            this.showNotification(
                `Application successfully ${action === 'approve' ? 'approved' : 'denied'}`,
                'success'
            );

            // Reload registrations
            await this.loadRegistrations();

        } catch (error) {
            console.error('Error in handleAction:', error);
            this.showNotification(error.message, 'error');
        }
    }

    confirmAction(action) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation_modal');
            const message = document.getElementById('confirmation_message');
            const confirmBtn = document.getElementById('confirm_action_btn');
            
            // Set message and button style based on action
            message.textContent = action === 'approve' ?
                'Are you sure you want to approve this application?' :
                'Are you sure you want to deny this application?';
            
            confirmBtn.className = `btn btn-${action === 'approve' ? 'approve' : 'deny'}`;
            confirmBtn.textContent = action === 'approve' ? 'Approve' : 'Deny';
            
            // Show modal
            modal.classList.add('active');
            
            // Handle confirm button click
            const handleConfirm = () => {
                modal.classList.remove('active');
                confirmBtn.removeEventListener('click', handleConfirm);
                resolve(true);
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
        });
    }

    closeConfirmationModal() {
        const modal = document.getElementById('confirmation_modal');
        modal.classList.remove('active');
    }

    goToPage(page) {
        this.currentPage = page;
        this.displayRegistrations(this.getPaginatedRegistrations());
        this.updatePagination();
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification_container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = document.createElement('i');
        icon.className = type === 'success' ? 'fas fa-check-circle' :
                        type === 'error' ? 'fas fa-exclamation-circle' :
                        'fas fa-info-circle';
        
        const text = document.createElement('span');
        text.textContent = message;

        notification.appendChild(icon);
        notification.appendChild(text);
        container.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize when DOM is ready
let registrationReview;
document.addEventListener('DOMContentLoaded', () => {
    registrationReview = new RegistrationReview();
    
    // Get teller info from session storage and populate user profile
    const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo'));
    const userNameElement = document.querySelector('.user-name');
    const avatarElement = document.querySelector('.user-avatar.dynamic-avatar');
    
    if (tellerInfo) {
        let fullName = '';
        if (tellerInfo.first_name && tellerInfo.last_name) {
            fullName = `${tellerInfo.first_name} ${tellerInfo.last_name}`;
        } else if (tellerInfo.name) {
            fullName = tellerInfo.name;
        }
        
        if (userNameElement && fullName) {
            userNameElement.textContent = fullName;
        }
        
        // Set avatar initial
        if (avatarElement && fullName) {
            const initial = fullName.trim().charAt(0).toUpperCase();
            avatarElement.textContent = initial;
        }
    }
}); 
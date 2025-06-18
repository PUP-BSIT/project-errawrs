class RegistrationReview {
    constructor() {
        this.loadRegistrations();
        this.setupEventListeners();
    }

    // Configuration - Dynamic base URL detection
    getBaseURL() {
        const host = window.location.hostname;
        
        // Check if we're on the EC2 server
        if (host === 'dev-teller.stackovercash.site') {
            return '/api';
        }
        
        // Local XAMPP environment
        return '/project-errawrs/src/api';
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="approve"]')) {
                this.handleRegistrationAction(e.target.dataset.registrationId, 'approve');
            } else if (e.target.matches('[data-action="deny"]')) {
                this.handleRegistrationAction(e.target.dataset.registrationId, 'deny');
            }
        });
    }

    async loadRegistrations() {
        try {
            const response = await fetch(`${this.getBaseURL()}/teller/get_registrations.php`, {
                credentials: 'include'
            });
            if (response.status === 403) {
                window.location.href = './bank_teller_login.html';
                return;
            }
            if (!response.ok) throw new Error('Failed to fetch registrations');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            this.displayRegistrations(data.registrations);
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    displayRegistrations(registrations) {
        const container = document.getElementById('registrations_container');
        if (!container) return;

        if (!registrations.length) {
            container.innerHTML = '<div class="no-data">No pending registrations</div>';
            return;
        }

        const html = registrations.map(reg => `
            <div class="registration-card" data-registration-id="${reg.registration_id}">
                <div class="registration-header">
                    <h3>${reg.first_name} ${reg.last_name}</h3>
                    <span class="registration-date">${new Date(reg.created_at).toLocaleDateString()}</span>
                </div>
                <div class="registration-details">
                    <p><strong>Email:</strong> ${reg.email}</p>
                    <p><strong>Phone:</strong> ${reg.phone_number}</p>
                    <p><strong>ID Type:</strong> ${reg.id_type}</p>
                    <p><strong>Nationality:</strong> ${reg.nationality}</p>
                    <p><strong>Address:</strong> ${reg.street}, ${reg.city}, ${reg.country} ${reg.zip_code}</p>
                </div>
                <div class="registration-actions">
                    <button class="btn btn-success" data-action="approve" data-registration-id="${reg.registration_id}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger" data-action="deny" data-registration-id="${reg.registration_id}">
                        <i class="fas fa-times"></i> Deny
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async handleRegistrationAction(registrationId, action) {
        try {
            const button = document.querySelector(`[data-action="${action}"][data-registration-id="${registrationId}"]`);
            const card = document.querySelector(`.registration-card[data-registration-id="${registrationId}"]`);
            
            if (!button || !card) return;

            // Disable buttons and show loading
            const buttons = card.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;

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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process registration');
            }
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Operation failed');

            // Show success message
            this.showNotification(`Registration ${action === 'approve' ? 'approved' : 'denied'} successfully`, 'success');
            
            // Remove the card with animation
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
                // Check if there are no more registrations
                if (!document.querySelector('.registration-card')) {
                    this.loadRegistrations(); // Reload to show "No pending registrations" message
                }
            }, 300);

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            // Re-enable buttons
            const buttons = document.querySelectorAll(`[data-registration-id="${registrationId}"]`);
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.innerHTML = btn.dataset.action === 'approve' ? 
                    '<i class="fas fa-check"></i> Approve' : 
                    '<i class="fas fa-times"></i> Deny';
            });
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RegistrationReview();
}); 
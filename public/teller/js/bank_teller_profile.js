// Function to show notifications
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification_container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check' : 'fa-circle-exclamation'}"></i>
        ${message}
    `;

    container.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 5000);
}

// Function to set loading state
function setLoadingState(isLoading) {
    const elements = {
        userProfile: document.querySelector('.user-profile'),
        pageHeader: document.querySelector('.page-header'),
        accountCard: document.querySelector('.account-card'),
        values: document.querySelectorAll('.value, .status-active'),
        userName: document.querySelector('[data-field="sidebar_name"]'),
        initials: document.querySelectorAll('.initials')
    };

    if (isLoading) {
        elements.values.forEach(el => el.classList.add('loading'));
        elements.userName.classList.add('loading');
        elements.initials.forEach(el => el.classList.add('loading'));
    } else {
        // Add loaded class with slight delays for smooth animation
        setTimeout(() => elements.userProfile.classList.add('loaded'), 100);
        setTimeout(() => elements.pageHeader.classList.add('loaded'), 200);
        setTimeout(() => elements.accountCard.classList.add('loaded'), 300);
        
        // Remove loading states
        elements.values.forEach(el => el.classList.remove('loading'));
        elements.userName.classList.remove('loading');
        elements.initials.forEach(el => el.classList.remove('loading'));
    }
}

// Function to load teller profile
async function loadTellerProfile() {
    try {
        // Set initial loading state
        setLoadingState(true);

        const response = await fetch('../../src/api/teller/profile.php');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load profile');
        }

        // Update profile information
        document.querySelector('[data-field="teller_number"]').textContent = data.teller_number;
        document.querySelector('[data-field="first_name"]').textContent = data.first_name;
        document.querySelector('[data-field="last_name"]').textContent = data.last_name;
        document.querySelector('[data-field="email_address"]').textContent = data.email_address;
        document.querySelector('[data-field="status"]').textContent = data.status;

        // Update sidebar name
        document.querySelector('[data-field="sidebar_name"]').textContent = `${data.first_name} ${data.last_name}`;

        // Update initials
        const initials = `${data.first_name[0]}${data.last_name[0]}`;
        document.querySelectorAll('.initials').forEach(element => {
            element.textContent = initials;
        });

        // Remove loading state
        setLoadingState(false);

        showNotification('Profile loaded successfully', 'success');

    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification(error.message, 'error');
        
        // Update UI to show error state
        const fieldsToUpdate = ['teller_number', 'first_name', 'last_name', 'email_address', 'status', 'sidebar_name'];
        fieldsToUpdate.forEach(field => {
            document.querySelector(`[data-field="${field}"]`).textContent = 'Error';
        });
        
        // Update initials to show error state
        document.querySelectorAll('.initials').forEach(element => {
            element.textContent = '--';
        });

        // Remove loading state even on error
        setLoadingState(false);
    }
}

// Load profile when the page loads
document.addEventListener('DOMContentLoaded', loadTellerProfile); 
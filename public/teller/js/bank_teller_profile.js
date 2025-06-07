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

// Function to load teller profile
async function loadTellerProfile() {
    try {
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

        // Update initials
        const initials = `${data.first_name[0]}${data.last_name[0]}`;
        document.querySelectorAll('.initials').forEach(element => {
            element.textContent = initials;
        });

        showNotification('Profile loaded successfully', 'success');

    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification(error.message, 'error');
        
        // Update UI to show error state
        const fieldsToUpdate = ['teller_number', 'first_name', 'last_name', 'email_address', 'status'];
        fieldsToUpdate.forEach(field => {
            document.querySelector(`[data-field="${field}"]`).textContent = 'Error';
        });
    }
}

// Load profile when the page loads
document.addEventListener('DOMContentLoaded', loadTellerProfile); 
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

// Function to get URL parameters
function getUrlParameter(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Function to load teller profile
async function loadTellerProfile() {
    try {
        const tellerNumber = getUrlParameter('teller_number');
        
        if (!tellerNumber) {
            showNotification('Please provide a teller number in the URL (e.g., ?teller_number=123)', 'error');
            
            // Update UI to show error state
            const fieldsToUpdate = ['teller_number', 'first_name', 'last_name', 'email_address', 'status'];
            fieldsToUpdate.forEach(field => {
                document.querySelector(`[data-field="${field}"]`).textContent = 'N/A';
            });
            document.querySelector('.user-name').textContent = 'Invalid Profile';
            
            return;
        }

        const response = await fetch(`../../src/api/teller/view_profile.php?teller_number=${tellerNumber}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load profile');
        }

        // Update profile information
        document.querySelector('.user-name').textContent = `${data.first_name} ${data.last_name}`;
        
        // Update account card information
        document.querySelector('[data-field="teller_number"]').textContent = tellerNumber;
        document.querySelector('[data-field="first_name"]').textContent = data.first_name;
        document.querySelector('[data-field="last_name"]').textContent = data.last_name;
        document.querySelector('[data-field="email_address"]').textContent = data.email_address;
        document.querySelector('[data-field="status"]').textContent = data.status;

        showNotification('Profile loaded successfully', 'success');

    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification(error.message, 'error');
        
        // Update UI to show error state
        const fieldsToUpdate = ['teller_number', 'first_name', 'last_name', 'email_address', 'status'];
        fieldsToUpdate.forEach(field => {
            document.querySelector(`[data-field="${field}"]`).textContent = 'Error';
        });
        document.querySelector('.user-name').textContent = 'Error Loading Profile';
    }
}

// Load profile when the page loads
document.addEventListener('DOMContentLoaded', loadTellerProfile); 
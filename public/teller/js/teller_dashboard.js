// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo'));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error('No teller info found in session storage');
    window.location.href = './bank_teller_login.html';
}

// Elements
const searchInput = document.querySelector('.search-input');

// Debounce function to prevent too many API calls
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

// Show notification
function showNotification(message, isError = false) {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification_container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification_container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    container.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Format currency
function formatCurrency(amount) {
    // Ensure amount is treated as a number
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
    
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericAmount);
}

// Display account details
function displayAccountDetails(account) {
    // Remove any existing account details
    const existingDetails = document.querySelector('.account-details-card');
    if (existingDetails) {
        existingDetails.remove();
    }

    // Parse balance as a number
    const balance = typeof account.balance === 'string' ? 
        parseFloat(account.balance.replace(/[^0-9.-]+/g, '')) : 
        parseFloat(account.balance);

    // Create account details card
    const detailsCard = document.createElement('div');
    detailsCard.className = 'account-details-card';
    detailsCard.innerHTML = `
        <div class="details-header">
            <h2>Account Details</h2>
            <span class="status-badge ${account.status.toLowerCase()}">${account.status}</span>
        </div>
        <div class="details-content">
            <div class="detail-row">
                <span class="detail-label">Account Number:</span>
                <span class="detail-value">${account.account_number}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Account Name:</span>
                <span class="detail-value">${account.user.name}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Account Type:</span>
                <span class="detail-value">${account.account_type || 'Savings'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Balance:</span>
                <span class="detail-value">${formatCurrency(balance)}</span>
            </div>
        </div>
    `;

    // Insert after the welcome section
    const welcomeSection = document.querySelector('.welcome-section');
    welcomeSection.insertAdjacentElement('afterend', detailsCard);

    // Add animation class after a small delay
    setTimeout(() => detailsCard.classList.add('show'), 10);
}

// Search account
async function searchAccount() {
    const searchTerm = searchInput.value.trim();
    console.log('Searching for:', searchTerm); // Debug log

    if (!searchTerm) {
        return;
    }

    if (!tellerInfo || !tellerInfo.teller_number) {
        console.error('No teller number found');
        showNotification('Please log in again', true);
        window.location.href = './bank_teller_login.html';
        return;
    }

    try {
        console.log('Making API request...'); // Debug log
        const response = await fetch(`/project-errawrs/src/api/teller/search_account.php?search=${encodeURIComponent(searchTerm)}&teller_number=${encodeURIComponent(tellerInfo.teller_number)}`);
        console.log('Response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('API response:', data); // Debug log

        if (!response.ok) {
            throw new Error(data.error || 'Failed to search account');
        }

        if (data.success && data.accounts && data.accounts.length > 0) {
            // Display account details in dashboard
            displayAccountDetails(data.accounts[0]);
        } else {
            showNotification('No accounts found', true);
            // Remove any existing account details
            const existingDetails = document.querySelector('.account-details-card');
            if (existingDetails) {
                existingDetails.remove();
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification(error.message || 'Error searching for account', true);
        // Remove any existing account details
        const existingDetails = document.querySelector('.account-details-card');
        if (existingDetails) {
            existingDetails.remove();
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (!tellerInfo) {
        window.location.href = './bank_teller_login.html';
        return;
    }

    // Add search input event listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchAccount, 500));
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchAccount();
            }
        });
    }

    // Update user profile if available
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement && tellerInfo.name) {
        userNameElement.textContent = tellerInfo.name;
    }

    // Add CSS for notifications if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }
            
            .notification {
                background: white;
                padding: 15px 25px;
                margin-bottom: 10px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                font-size: 14px;
                animation: slideIn 0.3s ease-out;
            }
            
            .notification.success {
                border-left: 4px solid #7ed957;
                color: #2e7b32;
            }
            
            .notification.error {
                border-left: 4px solid #ff4757;
                color: #d32f2f;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Add CSS for account details if not already present
    if (!document.getElementById('account-details-styles')) {
        const style = document.createElement('style');
        style.id = 'account-details-styles';
        style.textContent = `
            .account-details-card {
                background: white;
                border-radius: 15px;
                padding: 25px;
                margin: 20px 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
            }

            .account-details-card.show {
                opacity: 1;
                transform: translateY(0);
            }

            .details-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .details-header h2 {
                margin: 0;
                color: var(--color-primary-black);
                font-size: 20px;
            }

            .status-badge {
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
            }

            .status-badge.active {
                background-color: #e8f5e9;
                color: #2e7d32;
            }

            .status-badge.inactive {
                background-color: #ffebee;
                color: #c62828;
            }

            .details-content {
                display: grid;
                gap: 15px;
            }

            .detail-row {
                display: flex;
                align-items: center;
            }

            .detail-label {
                width: 150px;
                color: var(--color-gray);
                font-weight: 500;
            }

            .detail-value {
                color: var(--color-primary-black);
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }
});

// Handle logout
document.querySelector('.nav-logout a').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Clear session storage
    sessionStorage.removeItem('tellerInfo');
    
    // Redirect to login page
    window.location.href = './bank_teller_login.html';
}); 
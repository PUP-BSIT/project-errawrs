// Import the account database
const accountDatabase = {
    2023123456: {
        number: "2023123456",
        name: "Juan Dela Cruz",
        type: "Savings",
        balance: 25750.0,
        status: "Active",
    },
    2023987654: {
        number: "2023987654",
        name: "Maria Santos",
        type: "Checking",
        balance: 45000.0,
        status: "Active",
    },
    2023567890: {
        number: "2023567890",
        name: "Carlo Mendoza",
        type: "Savings",
        balance: 12500.5,
        status: "Active",
    },
    2023344556: {
        number: "2023344556",
        name: "Robert Lim",
        type: "Checking",
        balance: 78900.25,
        status: "Active",
    },
    3315746283: {
        number: "3315746283",
        name: "Sample Account",
        type: "Savings",
        balance: 50000.0,
        status: "Active",
    },
};

// Handle search functionality
function handleSearch() {
    const searchInput = document.querySelector('.search-input');
    const accountNumber = searchInput.value.trim();

    if (accountNumber.length >= 10) {
        const account = accountDatabase[accountNumber];
        if (account) {
            displayAccountCard(account);
        } else {
            hideAccountCard();
        }
    } else {
        hideAccountCard();
    }
}

// Display account card
function displayAccountCard(account) {
    // Remove existing card if any
    hideAccountCard();

    // Create account card
    const accountCard = document.createElement('div');
    accountCard.className = 'account-card';
    accountCard.innerHTML = `
        <div class="account-info">
            <div class="account-header">
                <h3>Account Details</h3>
                <div class="status-badge ${account.status.toLowerCase()}">${account.status}</div>
            </div>
            <div class="account-details">
                <div class="detail-row">
                    <span class="label">Account Number:</span>
                    <span class="value">${account.number}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Account Name:</span>
                    <span class="value">${account.name}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Account Type:</span>
                    <span class="value">${account.type}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Balance:</span>
                    <span class="value">₱${account.balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2
                    })}</span>
                </div>
            </div>
        </div>
    `;

    // Insert the card after the welcome section
    const welcomeSection = document.querySelector('.welcome-section');
    welcomeSection.insertAdjacentElement('afterend', accountCard);

    // Add animation
    setTimeout(() => accountCard.classList.add('show'), 10);
}

// Hide account card
function hideAccountCard() {
    const existingCard = document.querySelector('.account-card');
    if (existingCard) {
        existingCard.remove();
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input');
    
    // Handle Enter key press
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    // Handle input changes
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim().length === 0) {
            hideAccountCard();
        }
    });
});


document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const searchInput = document.getElementById('search_account');
    const accountContainer = document.getElementById('account_container');
    const accountModal = document.getElementById('account_modal');
    const accountForm = document.getElementById('account_form');
    const saveBtn = document.getElementById('save_btn');
    const cancelBtn = document.getElementById('cancel_btn');
    const successModal = document.getElementById('success_modal');
    const confirmModal = document.getElementById('confirm_modal');
    const logoutBtn = document.getElementById('logout_btn');

    // Get teller ID from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const tellerId = urlParams.get('teller_id');
    
    // If we have a teller ID, update the UI to show we're filtering
    if (tellerId) {
        const title = document.querySelector('.page-title');
        if (title) {
            title.textContent = 'Teller Accounts';
        }
        
        // Add a clear filter button
        const headerActions = document.querySelector('.content-header');
        if (headerActions) {
            const clearFilterBtn = document.createElement('button');
            clearFilterBtn.className = 'btn-secondary';
            clearFilterBtn.innerHTML = '<i class="fas fa-times"></i> Clear Teller Filter';
            clearFilterBtn.onclick = () => {
                window.location.href = 'user_accounts.html';
            };
            headerActions.appendChild(clearFilterBtn);
        }
    }

    // Search functionality with debounce
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchAccounts(this.value);
        }, 300);
    });

    // Search accounts function
    async function searchAccounts(searchTerm) {
        try {
            const params = new URLSearchParams();
            
            if (searchTerm) {
                params.append('search', searchTerm);
            }
            
            // Add teller ID to params if present
            if (tellerId) {
                params.append('teller_id', tellerId);
            }

            const response = await fetch(`/project-errawrs/src/api/admin/search_accounts.php?${params.toString()}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch accounts');
            }

            const data = await response.json();

            if (data.success) {
                displayAccounts(data.accounts);
            } else {
                showToast('error', data.error || 'Failed to search accounts');
            }
        } catch (error) {
            console.error('Error searching accounts:', error);
            showToast('error', 'Failed to search accounts');
        }
    }

    // Display accounts in cards
    function displayAccounts(accounts) {
        accountContainer.innerHTML = '';
        
        if (accounts.length === 0) {
            accountContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No accounts found</p>
                    ${tellerId ? '<p class="sub-text">Try clearing the teller filter</p>' : ''}
                </div>`;
            return;
        }

        accounts.forEach(account => {
            const card = createAccountCard(account);
            accountContainer.appendChild(card);
        });
    }

    // Create account card
    function createAccountCard(account) {
        const card = document.createElement('div');
        card.className = 'account-card';
        card.innerHTML = `
            <div class="status-indicator ${account.status}">
                <span class="status-icon"></span>
                ${account.status.charAt(0).toUpperCase() + account.status.slice(1)}
            </div>
            
            <div class="account-info">
                <div class="account-field">
                    <span class="account-label">Account Number</span>
                    <span class="account-value account-number">${account.account_number}</span>
                </div>
                <div class="account-field">
                    <span class="account-label">Balance</span>
                    <span class="account-value balance">$${parseFloat(account.balance).toFixed(2)}</span>
                </div>
                <div class="account-field">
                    <span class="account-label">Account Holder</span>
                    <span class="account-value">${account.user_name || 'N/A'}</span>
                </div>
                <div class="account-field">
                    <span class="account-label">Account Type</span>
                    <span class="account-type-badge ${account.account_type.toLowerCase()}">${account.account_type}</span>
                </div>
                ${account.teller ? `
                <div class="account-field">
                    <span class="account-label">Last Managed By</span>
                    <span class="account-value teller">${account.teller.name} (${account.teller.teller_number})</span>
                </div>
                ` : ''}
                <div class="account-field">
                    <span class="account-label">Phone Number</span>
                    <span class="account-value">${account.phone_number || 'N/A'}</span>
                </div>
                <div class="account-field">
                    <span class="account-label">Email</span>
                    <span class="account-value">${account.email || 'N/A'}</span>
                </div>
            </div>
            
            <div class="account-actions">
                <button class="btn-secondary" onclick="viewTransactions('${account.account_number}')">
                    <i class="fas fa-history"></i> View Transactions
                </button>
                <button class="btn-primary" onclick="editAccount('${account.account_number}')">
                    <i class="fas fa-edit"></i> Edit Account
                </button>
            </div>
        `;

        return card;
    }

    // View transactions function
    async function viewTransactions(accountNumber) {
        window.location.href = `transactions.html?account=${accountNumber}`;
    }

    // Edit account function
    async function editAccount(accountNumber) {
        try {
            const response = await fetch(`/project-errawrs/src/api/admin/get_account.php?account_number=${accountNumber}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch account details');
            }

            const data = await response.json();
            
            if (data.success) {
                openEditModal(data.account);
            } else {
                showToast('error', data.error || 'Failed to load account details');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('error', 'Failed to load account details');
        }
    }

    // Toast notification
    function showToast(type, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.querySelector('.toast-container').appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Initial load
    searchAccounts('');

    // Make functions globally available
    window.viewTransactions = viewTransactions;
    window.editAccount = editAccount;
}); 
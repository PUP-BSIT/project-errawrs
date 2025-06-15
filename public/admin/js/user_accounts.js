const ITEMS_PER_PAGE = 6;
let currentPage = 1;
let allUsers = [];
let filteredUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const userCardsContainer = document.getElementById('user_cards');
    const paginationContainer = document.getElementById('pagination');
    const searchInput = document.getElementById('search_user');
    const logoutBtn = document.getElementById('logout_btn');
    const pageTitle = document.querySelector('.page-title');

    // Log elements for debugging
    console.log('userCardsContainer:', userCardsContainer);
    console.log('paginationContainer:', paginationContainer);
    console.log('searchInput:', searchInput);
    console.log('logoutBtn:', logoutBtn);
    console.log('pageTitle:', pageTitle);

    // Ensure critical elements exist before proceeding
    if (!userCardsContainer || !paginationContainer || !searchInput || !logoutBtn || !pageTitle) {
        console.error('Critical DOM elements not found. Stopping script.');
        return;
    }

    // Initialize
    fetchUsers();
    setupEventListeners();

    function setupEventListeners() {
        // Search functionality
        searchInput.addEventListener('input', handleSearch);
        
        // Logout
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Logging out...', 'info');
            // Implement actual logout logic here
            setTimeout(() => window.location.href = 'login.html', 1000);
        });
    }

    async function fetchUsers() {
        userCardsContainer.classList.add('loading');
        
        try {
            const response = await fetch('/project-errawrs/src/api/admin/list_users.php', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch users');
            }

            allUsers = data.list;
            // Sort users: inactive first, then by creation date
            allUsers.sort((a, b) => {
                if (a.status !== b.status) {
                    return a.status === 'inactive' ? -1 : 1;
                }
                return new Date(b.user_created_at) - new Date(a.user_created_at);
            });
            
            filteredUsers = [...allUsers];
            renderUsers();
            renderPagination();
            updatePageTitle();
            showToast('Users loaded successfully', 'success');

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            renderNoResults();
        } finally {
            userCardsContainer.classList.remove('loading');
        }
    }

    function updatePageTitle() {
        const totalUsersCountElement = document.getElementById('total_users_count');
        if (totalUsersCountElement) {
            totalUsersCountElement.textContent = allUsers.length;
        }
    }

    function renderUsers() {
        if (!userCardsContainer) {
            console.error('userCardsContainer is null in renderUsers. Cannot render users.');
            return;
        }
        userCardsContainer.innerHTML = '';
        
        if (filteredUsers.length === 0) {
            renderNoResults();
            return;
        }

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const usersToShow = filteredUsers.slice(startIndex, endIndex);

        // Adjust grid layout for single user
        userCardsContainer.style.gridTemplateColumns = usersToShow.length === 1 
            ? 'minmax(300px, 400px)' 
            : 'repeat(auto-fit, minmax(300px, 1fr))';

        usersToShow.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-header">
                    <div class="user-info">
                        <h3>${user.first_name} ${user.last_name}</h3>
                        <div class="account-number">Account #${user.user_id}</div>
                    </div>
                    <span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span>
                </div>
                <div class="user-details">
                    <div class="detail-row">
                        <span class="detail-label">Username:</span>
                        <span class="detail-value">${user.username}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Account No:</span>
                        <span class="detail-value">${user.account_number || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${user.phone_number || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Joined:</span>
                        <span class="detail-value">${new Date(user.user_created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
            console.log('Attempting to append card. Current userCardsContainer:', userCardsContainer);
            console.log('Card element:', card);
            console.log('Card innerHTML:', card.innerHTML);
            userCardsContainer.appendChild(card);
        });
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

        if (totalPages <= 1) return;

        // Previous button
        const prevBtn = createPaginationButton('Previous', currentPage === 1, () => {
            if (currentPage > 1) {
                currentPage--;
                renderUsers();
                renderPagination();
            }
        });
        paginationContainer.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = createPaginationButton(i, i === currentPage, () => {
                currentPage = i;
                renderUsers();
                renderPagination();
            });
            if (i === currentPage) pageBtn.classList.add('active');
            paginationContainer.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = createPaginationButton('Next', currentPage === totalPages, () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderUsers();
                renderPagination();
            }
        });
        paginationContainer.appendChild(nextBtn);
    }

    function createPaginationButton(text, disabled, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        return button;
    }

    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        filteredUsers = allUsers.filter(user => 
            `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm) ||
            user.user_id.toString().includes(searchTerm) ||
            user.username.toLowerCase().includes(searchTerm) ||
            (user.account_number && user.account_number.toLowerCase().includes(searchTerm))
        );
        currentPage = 1;
        renderUsers();
        renderPagination();
        updatePageTitle(); // Update title when filtering
    }

    function renderNoResults() {
        userCardsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No users found</p>
            </div>
        `;
    }

    function showToast(message, type) {
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
            // Fallback: append to body if toast container is not found
            document.body.appendChild(toast);
            console.warn('Toast container not found, appending toast to body.');
        }

        // Auto-remove after 3 seconds
        setTimeout(() => toast.remove(), 3000);

        // Manual close
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => toast.remove());
        }
    }
});
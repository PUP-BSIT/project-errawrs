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

    // Initialize
    fetchUsers();
    setupEventListeners();

    function setupEventListeners() {
        // Search functionality
        searchInput.addEventListener('input', handleSearch);
        
        // Logout
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/project-errawrs/src/api/auth/logout.php', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {}
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    async function fetchUsers() {
        userCardsContainer.classList.add('loading');
        
        try {
            		const response = await fetch(APP_CONFIG.getApiUrl('admin/list_users.php'), {
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

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            renderNoResults();
        } finally {
            userCardsContainer.classList.remove('loading');
        }
    }

    function updatePageTitle() {
        pageTitle.innerHTML = `Total Users: <span>${allUsers.length}</span>`;
    }

    function renderUsers() {
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
            card.setAttribute('data-user-id', user.user_id); // Add data-user-id
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
        let toastContainer = document.querySelector('.toast-container.toast-top-right');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container toast-top-right';
            document.body.appendChild(toastContainer);
        }
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

        // FIX: Only append, do not call showToast recursively
        if (toastContainer) {
        toastContainer.appendChild(toast);
        } else {
            // fallback: add to body if container missing
            document.body.appendChild(toast);
        }

        // Auto-remove after 3 seconds
        setTimeout(() => toast.remove(), 3000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    }

    // Back button for user detail card
    const backBtn = document.getElementById('user_detail_back');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('user_detail_card').style.display = 'none';
            document.querySelector('.user-cards-wrapper').style.display = '';
            document.querySelector('.pagination').style.display = '';
            document.querySelector('.content-header').style.display = '';
        };
    }

    // Delegate click event to user cards
    document.getElementById('user_cards').addEventListener('click', async (e) => {
        const card = e.target.closest('.user-card');
        if (!card) return;
        const userId = card.getAttribute('data-user-id');
        if (!userId) return;
        // Fetch user details
        try {
            const response = await fetch(APP_CONFIG.getApiUrl(`admin/get_user.php?user_id=${userId}`), { credentials: 'include' });
            const data = await response.json();
            if (data.success && data.user) {
                showUserDetailsCard(data.user);
            } else {
                alert('Failed to load user details.');
            }
        } catch (err) {
            alert('Error loading user details.');
        }
    });

    // Modal close logic for ID image
    const idImageModal = document.getElementById('idImageModal');
    const idImageModalClose = document.getElementById('idImageModalClose');
    if (idImageModal && idImageModalClose) {
        idImageModalClose.onclick = function() {
            idImageModal.style.display = 'none';
            document.getElementById('idImageModalImg').src = '';
        };
        idImageModal.onclick = function(e) {
            if (e.target === idImageModal) {
                idImageModal.style.display = 'none';
                document.getElementById('idImageModalImg').src = '';
            }
        };
    }
});

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showUserDetailsCard(user) {
    document.getElementById('ud_user_id').textContent = user.user_id;
    document.getElementById('ud_username').textContent = user.username;
    document.getElementById('ud_first_name').textContent = user.first_name;
    document.getElementById('ud_last_name').textContent = user.last_name;
    document.getElementById('ud_phone_number').textContent = user.phone_number;
    document.getElementById('ud_date_of_birth').textContent = user.date_of_birth;
    document.getElementById('ud_nationality').textContent = capitalizeFirst(user.nationality);
    document.getElementById('ud_street').textContent = user.street;
    document.getElementById('ud_city').textContent = user.city;
    document.getElementById('ud_zip_code').textContent = user.zip_code;
    document.getElementById('ud_country').textContent = capitalizeFirst(user.country);
    document.getElementById('ud_email').textContent = user.email;
    document.getElementById('ud_id_type').textContent = user.id_type;
    document.getElementById('ud_created_at').textContent = user.created_at;
    // ID image button
    const idImageSpan = document.getElementById('ud_id_image');
    if (user.id_image) {
        idImageSpan.innerHTML = `<button class='view-id-image-btn'>View ID Image</button>`;
        const btn = idImageSpan.querySelector('.view-id-image-btn');
        btn.onclick = function() {
            document.getElementById('idImageModalImg').src = user.id_image;
            document.getElementById('idImageModal').style.display = 'flex';
        };
    } else {
        idImageSpan.textContent = 'N/A';
    }
    document.getElementById('user_detail_card').style.display = 'block';
    document.querySelector('.user-cards-wrapper').style.display = 'none';
    document.querySelector('.pagination').style.display = 'none';
    document.querySelector('.content-header').style.display = 'none';
}

// Session check on page load
(async function() {
    try {
        const res = await fetch('/project-errawrs/src/api/auth/session_check.php', { credentials: 'include' });
        const data = await res.json();
        if (!data.success) {
            window.location.href = 'login.html';
        }
    } catch (e) {
        window.location.href = 'login.html';
    }
})();

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        window.location.reload();
    }
});
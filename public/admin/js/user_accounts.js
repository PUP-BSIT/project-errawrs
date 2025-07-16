import { API_ENDPOINTS } from '/api_config.js';

const ITEMS_PER_PAGE = 3;
let currentPage = 1;
let allUsers = [];
let filteredUsers = [];

// DOM Elements (assigned in init)
let userCardsContainer, paginationContainer, searchInput, logoutBtn, pageTitle,
    backBtn, idImageModal, idImageModalClose;

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    logoutBtn.addEventListener('click', handleLogout);
    if (backBtn) backBtn.onclick = handleBackBtn;
    if (idImageModal && idImageModalClose) {
        idImageModalClose.onclick = closeIdImageModal;
        idImageModal.onclick = (e) => {
            if (e.target === idImageModal) closeIdImageModal();
        };
    }
    userCardsContainer.addEventListener('click', handleUserCardClick);
}

async function handleLogout(e) {
    e.preventDefault();
    try {
        await fetch(API_ENDPOINTS.USER_LOGOUT, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (err) {}
    sessionStorage.clear();
    window.location.href = '/login';
}

function handleBackBtn() {
    document.getElementById('user_detail_card').style.display = 'none';
    document.querySelector('.user-cards-wrapper').style.display = '';
    document.querySelector('.pagination').style.display = '';
    document.querySelector('.content-header').style.display = '';
}

function closeIdImageModal() {
    idImageModal.style.display = 'none';
    document.getElementById('idImageModalImg').src = '';
}

async function handleUserCardClick(e) {
    if (e.target.classList.contains('view-detail-btn')) {
        const card = e.target.closest('.user-card');
        if (!card) return;
        const userId = card.getAttribute('data-user-id');
        if (!userId) return;
        try {
            const response = await fetch(`${API_ENDPOINTS.ADMIN_GET_USER}/${userId}`, { credentials: 'include' });
            if (!response.ok) {
                let msg = 'Failed to load user details.';
                if (response.status === 404) msg = 'User not found.';
                showToast(msg, 'error');
                return;
            }
            const data = await response.json();
            if (data.success && data.user) {
                showUserDetailsCard(data.user);
            } else {
                showToast(data.error || 'Failed to load user details.', 'error');
            }
        } catch (err) {
            showToast('Network error: Could not load user details.', 'error');
        }
    }
}

async function fetchUsers() {
    userCardsContainer.classList.add('loading');
    try {
        const response = await fetch(API_ENDPOINTS.ADMIN_LIST_USERS, {
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
        updatePagination();
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
            <div class="view-detail-btn-wrapper">
                <button class="view-detail-btn"><i class='fas fa-eye'></i> View Details</button>
            </div>
        `;
        card.setAttribute('data-user-id', user.user_id); // Add data-user-id
        userCardsContainer.appendChild(card);
    });
}

// --- Pagination Logic (from review_registrations.js style) ---
function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    let html = '';
    const maxVisible = 5;
    // Previous button
    html += `<button class="page-number" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">&laquo; Prev</button>`;
    if (totalPages <= maxVisible + 1) {
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
    } else {
        html += `<button class="page-number ${1 === currentPage ? 'active' : ''}" onclick="goToPage(1)">1</button>`;
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 3) {
            start = 2;
            end = 5;
        } else if (currentPage >= totalPages - 2) {
            start = totalPages - 4;
            end = totalPages - 1;
        }
        if (start > 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        for (let i = start; i <= end; i++) {
            html += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
        if (end < totalPages - 1) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        html += `<button class="page-number ${totalPages === currentPage ? 'active' : ''}" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    // Next button
    html += `<button class="page-number" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">Next &raquo;</button>`;
    pagination.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderUsers();
    updatePagination();
}

// Expose goToPage globally for inline onclick
window.goToPage = goToPage;

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
    updatePagination();
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
    if (toastContainer) {
        toastContainer.appendChild(toast);
    } else {
        document.body.appendChild(toast);
    }
    setTimeout(() => toast.remove(), 3000);
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
}

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

// --- Initialization Function ---
function init() {
    // Assign DOM elements
    userCardsContainer = document.getElementById('user_cards');
    paginationContainer = document.getElementById('pagination');
    searchInput = document.getElementById('search_user');
    logoutBtn = document.getElementById('logout_btn');
    pageTitle = document.querySelector('.page-title');
    backBtn = document.getElementById('user_detail_back');
    idImageModal = document.getElementById('idImageModal');
    idImageModalClose = document.getElementById('idImageModalClose');
    fetchUsers();
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);

// Session check on page load
(async function() {
    try {
        const res = await fetch(API_ENDPOINTS.ADMIN_SESSION_CHECK, { credentials: 'include' });
        const data = await res.json();
        if (!data.success) {
            window.location.href = '/login';
        }
    } catch (e) {
        window.location.href = '/login';
    }
})();

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        window.location.reload();
    }
});
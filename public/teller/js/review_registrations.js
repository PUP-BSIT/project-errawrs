import { API_ENDPOINTS } from '/api_config.js';

// State object to hold all registration review data
const regReviewState = {
    currentPage: 1,
    itemsPerPage: 2,
    currentStatus: 'pending',
    allRegistrations: [],
    filteredRegistrations: []
};

// Set up event listeners for filter and search
function setupEventListeners() {
        const statusFilter = document.getElementById('status_filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
            regReviewState.currentStatus = statusFilter.value;
            regReviewState.currentPage = 1;
            loadRegistrations();
            });
        }
        const searchBox = document.getElementById('search_box');
        if (searchBox) {
            searchBox.addEventListener('input', () => {
            regReviewState.currentPage = 1;
            applySearchFilter();
            displayRegistrations(getPaginatedRegistrations());
            updatePagination();
            });
        }
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                document.getElementById('application_modal').classList.add('hidden');
            });
        }
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('application_modal');
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }

// Load registrations from the server
async function loadRegistrations() {
        try {
        const url = new URL(API_ENDPOINTS?.TELLER_REGISTRATIONS || '/api/teller/registrations', window.location.origin);
        url.searchParams.append('status', regReviewState.currentStatus);
            url.searchParams.append('page', 1);
            url.searchParams.append('per_page', 1000);
            const response = await fetch(url, { credentials: 'include' });
            if (response.status === 403) {
                window.location.href = './bank_teller_login.html';
                return;
            }
            if (!response.ok) {
            throw new Error('Failed to fetch registrations');
            }
            const data = await response.json();
            if (!data.success) {
            throw new Error(data.error || 'Unknown error');
            }
        regReviewState.allRegistrations = data.registrations;
        applySearchFilter();
        displayRegistrations(getPaginatedRegistrations());
        updatePagination();
        } catch (error) {
        showNotification(error.message, 'error');
            const container = document.querySelector('.applications-grid');
            if (container) {
            container.innerHTML =
                '<div class="no-applications">' +
                '<i class="fas fa-exclamation-circle"></i>' +
                '<p>Error loading applications. Please try again.</p>' +
                '</div>';
            }
        }
    }

// Filter registrations by search box
function applySearchFilter() {
        const searchBox = document.getElementById('search_box');
        const query = searchBox ? searchBox.value.trim().toLowerCase() : '';
        if (!query) {
        regReviewState.filteredRegistrations =
            regReviewState.allRegistrations;
        } else {
        regReviewState.filteredRegistrations =
            regReviewState.allRegistrations.filter(reg => {
                return (
                    (reg.account_number &&
                        reg.account_number.toLowerCase().includes(query)) ||
                    (reg.first_name &&
                        reg.first_name.toLowerCase().includes(query)) ||
                    (reg.last_name &&
                        reg.last_name.toLowerCase().includes(query))
                );
            });
        }

    // Sort by status if 'all' is selected
    if (regReviewState.currentStatus === 'all') {
        const statusOrder = { 'pending': 0, 'approved': 1, 'rejected': 2 };
        regReviewState.filteredRegistrations.sort((a, b) => {
            return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        });
    }
}

// Get registrations for the current page
function getPaginatedRegistrations() {
    const start = (regReviewState.currentPage - 1) *
        regReviewState.itemsPerPage;
    const end = start + regReviewState.itemsPerPage;
    return regReviewState.filteredRegistrations.slice(start, end);
    }

// Display registration cards (all design is handled by CSS classes)
function displayRegistrations(registrations) {
    const container = document.querySelector('.applications-grid');
    if (!container) return;
    // Add or remove the single-card class
    if (registrations.length === 1) {
        container.classList.add('single-card');
    } else {
        container.classList.remove('single-card');
    }
    // Add or remove the empty-state class
    if (!registrations.length) {
        container.classList.add('empty-state');
        container.innerHTML =
            '<div class="no-applications">' +
            '<i class="fas fa-inbox fa-3x"></i>' +
            '<p>No ' +
            (regReviewState.currentStatus === 'all'
                ? ''
                : regReviewState.currentStatus) +
            ' applications found</p>' +
            (regReviewState.currentStatus !== 'pending'
                ? '<button class="btn view-pending" ' +
                  'onclick="viewPending()">' +
                  '<i class="fas fa-clock"></i> View Pending Applications' +
                  '</button>'
                : '') +
            '</div>';
        return;
    } else {
        container.classList.remove('empty-state');
    }
const html = registrations
    .map(reg => {
        return (
            '<div class="registration-card" ' +
            'data-registration-id="' + reg.registration_id + '" ' +
            'data-dob="' + (reg.date_of_birth || '') + '" ' +
            'data-street="' + (reg.street_address || '') + '" ' +
            'data-city="' + (reg.city || '') + '" ' +
            'data-country="' + (reg.country || '') + '" ' +
            'data-zip-code="' + (reg.zip_code || '') + '" ' +
            'data-id-image="' + (reg.id_image || '') + '" ' +
            'data-request-type="' + (reg.request_type || '') + '" ' +
            'data-account-type="' + (reg.account_type || '') + '">' +
            '<div class="status-badge status-badge-absolute ' +
            reg.status + '" title="Application Status">' +
            '<i class="fas ' +
            (reg.status === 'pending'
                ? 'fa-clock'
                : reg.status === 'approved'
                ? 'fa-check-circle'
                : 'fa-times-circle') +
            '"></i> ' +
            reg.status.charAt(0).toUpperCase() +
            reg.status.slice(1) +
            '</div>' +
            '<div class="card-left">' +
            '<div class="registration-header">' +
            '<div class="applicant-info">' +
            '<h3 class="applicant-name">' +
            reg.first_name +
            ' ' +
            reg.last_name +
            '</h3>' +
            '<div class="meta-info">' +
            '<span class="application-date" title="Application Date">' +
            '<i class="far fa-calendar-alt"></i> ' +
            new Date(reg.created_at).toLocaleDateString() +
            '</span>' +
            '<span class="application-id" title="Application ID">' +
            '<i class="fas fa-hashtag"></i> ' +
            reg.registration_id +
            '</span>' +
            '<span class="request-type-badge" title="Request Type">' +
            '<i class="fas fa-info-circle"></i> ' +
            (reg.request_type
                ? reg.request_type.replace('_', ' ').toUpperCase()
                : 'N/A') +
            '</span>' +
            (reg.request_type === 'add_account'
                ? '<span class="account-type-badge" ' +
                  'title="Account Type">' +
                  '<i class="fas fa-university"></i> ' +
                  (reg.account_type
                      ? reg.account_type.charAt(0).toUpperCase() +
                        reg.account_type.slice(1)
                      : 'N/A') +
                  '</span>'
                : '') +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="registration-details">' +
            '<div class="detail-row">' +
            '<div class="detail-item email">' +
            '<i class="far fa-envelope"></i> ' +
            '<span>' + reg.email + '</span>' +
            '</div>' +
            '<div class="detail-item phone">' +
            '<i class="fas fa-phone"></i> ' +
            '<span>' + reg.phone_number + '</span>' +
            '</div>' +
            '</div>' +
            '<div class="detail-row">' +
            '<div class="detail-item id-type">' +
            '<i class="fas fa-id-card"></i> ' +
            '<span>' + reg.id_type + '</span>' +
            '</div>' +
            '<div class="detail-item nationality">' +
            '<i class="fas fa-globe"></i> ' +
            '<span>' + reg.nationality + '</span>' +
            '</div>' +
            '</div>' +
            (reg.status !== 'pending'
                ? '<div class="update-info">' +
                  '<i class="far fa-clock"></i> Last updated ' +
                  getTimeAgo(new Date(reg.updated_at)) +
                  '</div>'
                : '') +
            '</div>' +
            (reg.status === 'pending'
                ? '<div class="action-buttons-row">' +
                  '<button class="btn btn-approve" ' +
                  'onclick="handleAction(' +
                  reg.registration_id +
                  ', \'approve\')">' +
                  '<i class="fas fa-check"></i> Approve</button>' +
                  '<button class="btn btn-deny" ' +
                  'onclick="handleAction(' +
                  reg.registration_id +
                  ', \'deny\')">' +
                  '<i class="fas fa-times"></i> Deny</button>' +
                  '</div>'
                : '') +
            '<button class="btn btn-view btn-view-details" ' +
            'onclick="viewDetails(' +
            reg.registration_id +
            ')"><i class="fas fa-eye"></i> View Details</button>' +
            '</div>' +
            '</div>'
        );
    })
    .join('');
    container.innerHTML = html;
}

// Update pagination controls
function updatePagination() {
    const totalPages =
        Math.ceil(regReviewState.filteredRegistrations.length /
            regReviewState.itemsPerPage) || 1;
    const pageNumbers = document.getElementById('page-numbers');
    if (pageNumbers) {
        let html = '';
        const currentPage = regReviewState.currentPage;
        const maxVisible = 5;

        // Always show first page
        if (totalPages <= maxVisible + 1) {
            // Show all pages if not too many
            for (let i = 1; i <= totalPages; i++) {
                html +=
                    '<button class="page-number ' +
                    (i === currentPage ? 'active' : '') +
                    '" onclick="goToPage(' +
                    i +
                    ')">' +
                    i +
                    '</button>';
            }
        } else {
            // Show first page
            html +=
                '<button class="page-number ' +
                (1 === currentPage ? 'active' : '') +
                '" onclick="goToPage(1)">1</button>';

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
                html +=
                    '<button class="page-number ' +
                    (i === currentPage ? 'active' : '') +
                    '" onclick="goToPage(' +
                    i +
                    ')">' +
                    i +
                    '</button>';
            }

            if (end < totalPages - 1) {
                html += '<span class="pagination-ellipsis">...</span>';
            }

            // Show last page
            html +=
                '<button class="page-number ' +
                (totalPages === currentPage ? 'active' : '') +
                '" onclick="goToPage(' +
                totalPages +
                ')">' +
                totalPages +
                '</button>';
        }
        pageNumbers.innerHTML = html;
    }
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn) {
        prevBtn.disabled = regReviewState.currentPage === 1;
        prevBtn.onclick = function() {
            if (regReviewState.currentPage > 1) {
                goToPage(regReviewState.currentPage - 1);
            }
        };
    }
    if (nextBtn) {
        nextBtn.disabled = regReviewState.currentPage === totalPages;
        nextBtn.onclick = function() {
            if (regReviewState.currentPage < totalPages) {
                goToPage(regReviewState.currentPage + 1);
            }
        };
    }
}

// Show details view for a registration
function viewDetails(registrationId) {
        try {
        const card = document.querySelector(
            '[data-registration-id="' + registrationId + '"]'
        );
            if (!card) {
                throw new Error('Registration card not found');
            }
            document.querySelector('.filter-section').classList.add('hidden');
            document.querySelector('.applications-grid').classList.add('hidden');
            document.querySelector('.pagination-container').classList.add('hidden');
            const detailsContainer = document.createElement('div');
            detailsContainer.className = 'registration-details-view';
            const details = {
                id: registrationId,
            name:
                card.querySelector('.applicant-name')?.textContent || 'N/A',
                email: card.querySelector('.email span')?.textContent || 'N/A',
                phone: card.querySelector('.phone span')?.textContent || 'N/A',
                idType: card.querySelector('.id-type span')?.textContent || 'N/A',
            nationality:
                card.querySelector('.nationality span')?.textContent || 'N/A',
            status:
                card.querySelector('.status-badge')?.textContent
                    ?.toLowerCase()
                    .trim() || 'pending',
            createdAt:
                card.querySelector('.application-date')?.textContent?.trim() ||
                'N/A',
            updatedAt:
                card.querySelector('.update-info')?.textContent?.trim() ||
                'Not reviewed yet',
            requestType: card.dataset.requestType
                ? card.dataset.requestType.replace('_', ' ').toUpperCase()
                : 'N/A',
            accountType: card.dataset.accountType
                ? card.dataset.accountType.charAt(0).toUpperCase() +
                  card.dataset.accountType.slice(1)
                : 'N/A',
            };
        detailsContainer.innerHTML =
            '<div class="details-header">' +
            '<button class="btn btn-back" onclick="goBack()">' +
            '<i class="fas fa-arrow-left"></i> Back to Applications</button>' +
            '<div class="status-badge ' +
            details.status +
            '"><i class="fas ' +
            (details.status === 'pending'
                ? 'fa-clock'
                : details.status === 'approved'
                ? 'fa-check-circle'
                : 'fa-times-circle') +
            '"></i> ' +
            details.status.charAt(0).toUpperCase() +
            details.status.slice(1) +
            '</div></div>' +
            '<div class="details-content">' +
            '<div class="details-main">' +
            '<div class="section">' +
            '<h2>Personal Information</h2>' +
            '<div class="info-grid">' +
            '<div class="info-item"><label><i class="fas fa-user"></i> Full Name</label>' +
            '<span>' + details.name + '</span></div>' +
            '<div class="info-item"><label><i class="far fa-envelope"></i> Email Address</label>' +
            '<span>' + details.email + '</span></div>' +
            '<div class="info-item"><label><i class="fas fa-phone"></i> Phone Number</label>' +
            '<span>' + details.phone + '</span></div>' +
            '<div class="info-item"><label><i class="fas fa-calendar"></i> Date of Birth</label>' +
            '<span>' + new Date(card.dataset.dob).toLocaleDateString() + '</span></div>' +
            '<div class="info-item"><label><i class="fas fa-globe"></i> Nationality</label>' +
            '<span>' + details.nationality + '</span></div>' +
            '</div></div>' +
            '<div class="section">' +
            '<h2>Request Type</h2>' +
            '<div class="info-grid">' +
            '<div class="info-item"><label><i class="fas fa-info-circle"></i> Request Type</label>' +
            '<span>' + details.requestType + '</span></div>' +
            '</div></div>' +
            (details.requestType === 'ADD ACCOUNT'
                ? '<div class="section">' +
                  '<h2>Account Type</h2>' +
                  '<div class="info-grid">' +
                  '<div class="info-item"><label><i class="fas fa-university"></i> Account Type</label>' +
                  '<span>' + details.accountType + '</span></div>' +
                  '</div></div>'
                : '') +
            '<div class="section">' +
            '<h2>Address Information</h2>' +
            '<div class="info-grid">' +
            '<div class="info-item"><label><i class="fas fa-map-marker-alt"></i> Street Address</label>' +
            '<span>' + card.dataset.street + '</span></div>' +
            '<div class="info-item"><label><i class="fas fa-city"></i> City</label>' +
            '<span>' + card.dataset.city + '</span></div>' +
            '<div class="info-item"><label><i class="fas fa-map"></i> Country</label>' +
            '<span>' + card.dataset.country + '</span></div>' +
            '<div class="info-item"><label><i class="fas fa-mail-bulk"></i> ZIP Code</label>' +
            '<span>' + card.dataset.zipCode + '</span></div>' +
            '</div></div>' +
            '<div class="section">' +
            '<h2>ID Document</h2>' +
            '<div class="id-preview-section">' +
            '<div class="id-preview-container">' +
            '<button class="btn btn-view-image" onclick="showImageOverlay(\'' + card.dataset.idImage + '\')">' +
            '<i class="fas fa-image"></i> View Image</button>' +
            '</div>' +
            '</div></div>' +
            (details.status === 'pending'
                ? '<div class="section">' +
                  '<h2>Actions</h2>' +
                  '<div class="details-actions">' +
                  '<button class="btn btn-approve" ' +
                  'onclick="handleAction(\'' +
                  details.id +
                  '\', \'approve\')">' +
                  '<i class="fas fa-check"></i> Approve Application</button>' +
                  '<button class="btn btn-deny" ' +
                  'onclick="handleAction(\'' +
                  details.id +
                  '\', \'deny\')">' +
                  '<i class="fas fa-times"></i> Reject Application</button>' +
                  '</div></div>'
                : '') +
            '</div></div>';
            document.querySelector('.main-content').appendChild(detailsContainer);
        } catch (error) {
        showNotification('Error loading application details', 'error');
        }
    }

// Go back to the main list from details view
function goBack() {
        const detailsView = document.querySelector('.registration-details-view');
        if (detailsView) {
            detailsView.remove();
        }
        document.querySelector('.filter-section').classList.remove('hidden');
        document.querySelector('.applications-grid').classList.remove('hidden');
        document.querySelector('.pagination-container').classList.remove('hidden');
    }

// View only pending applications
function viewPending() {
    regReviewState.currentStatus = 'pending';
    regReviewState.currentPage = 1;
    loadRegistrations();
    }

// Get time ago string
function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + ' years ago';
        if (interval === 1) return 'a year ago';
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return interval + ' months ago';
        if (interval === 1) return 'a month ago';
        interval = Math.floor(seconds / 86400);
        if (interval > 1) return interval + ' days ago';
        if (interval === 1) return 'yesterday';
        interval = Math.floor(seconds / 3600);
        if (interval > 1) return interval + ' hours ago';
        if (interval === 1) return 'an hour ago';
        interval = Math.floor(seconds / 60);
        if (interval > 1) return interval + ' minutes ago';
        if (interval === 1) return 'a minute ago';
        return 'just now';
    }

// Approve or deny a registration, with loading state
async function handleAction(registrationId, action) {
    let approveBtn, denyBtn, originalApproveHTML, originalDenyHTML;
    const detailsView = document.querySelector('.registration-details-view');
    if (detailsView) {
        approveBtn = detailsView.querySelector('.btn-approve');
        denyBtn = detailsView.querySelector('.btn-deny');
    } else {
        const card = document.querySelector(
            '[data-registration-id="' + registrationId + '"]'
        );
        if (card) {
            approveBtn = card.querySelector('.btn-approve');
            denyBtn = card.querySelector('.btn-deny');
        }
    }
    if (approveBtn) originalApproveHTML = approveBtn.innerHTML;
    if (denyBtn) originalDenyHTML = denyBtn.innerHTML;
    try {
        if (approveBtn) approveBtn.disabled = true;
        if (denyBtn) denyBtn.disabled = true;
        if (action === 'approve' && approveBtn) {
            approveBtn.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else if (action === 'deny' && denyBtn) {
            denyBtn.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
        const confirmed = await confirmAction(action);
        if (!confirmed) {
            if (approveBtn) {
                approveBtn.disabled = false;
                approveBtn.innerHTML = originalApproveHTML;
            }
            if (denyBtn) {
                denyBtn.disabled = false;
                denyBtn.innerHTML = originalDenyHTML;
            }
            return;
        }
        await reviewRegistration(registrationId, action);
        } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = originalApproveHTML;
        }
        if (denyBtn) {
            denyBtn.disabled = false;
            denyBtn.innerHTML = originalDenyHTML;
        }
    }
}

// Show a confirmation modal for approve/deny
function confirmAction(action) {
    return new Promise(resolve => {
            const modal = document.getElementById('confirmation_modal');
            const message = document.getElementById('confirmation_message');
            const confirmBtn = document.getElementById('confirm_action_btn');
            const cancelBtn = document.getElementById('cancel_action_btn');
        message.textContent =
            action === 'approve'
                ? 'Are you sure you want to approve this application?'
                : 'Are you sure you want to deny this application?';
        confirmBtn.className =
            'btn btn-' + (action === 'approve' ? 'approve' : 'deny');
        confirmBtn.textContent =
            action === 'approve' ? 'Approve' : 'Deny';
            modal.classList.add('active');
            const handleConfirm = () => {
                modal.classList.remove('active');
                confirmBtn.removeEventListener('click', handleConfirm);
            if (cancelBtn)
                cancelBtn.removeEventListener('click', handleCancel);
                resolve(true);
            };
            const handleCancel = () => {
                modal.classList.remove('active');
                confirmBtn.removeEventListener('click', handleConfirm);
            if (cancelBtn)
                cancelBtn.removeEventListener('click', handleCancel);
                resolve(false);
            };
            confirmBtn.addEventListener('click', handleConfirm);
            if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
        });
    }

// Close the confirmation modal
function closeConfirmationModal() {
        const modal = document.getElementById('confirmation_modal');
        modal.classList.remove('active');
    }

// Update review/approve/reject registration API call
async function reviewRegistration(registrationId, action, reason = '') {
    try {
        const response = await fetch(API_ENDPOINTS?.TELLER_REVIEW_REGISTRATION || '/api/teller/registrations/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ registration_id: registrationId, action, reason })
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }
        showNotification('Registration updated successfully', 'success');
        goBack();
        loadRegistrations();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Go to a specific page
function goToPage(page) {
    regReviewState.currentPage = page;
    displayRegistrations(getPaginatedRegistrations());
    updatePagination();
    }

// Show a notification message
function showNotification(message, type = 'info') {
        const container = document.getElementById('notification_container');
        if (!container) return;
        const notification = document.createElement('div');
    notification.className = 'notification ' + type;
        const icon = document.createElement('i');
    icon.className =
        type === 'success'
            ? 'fas fa-check-circle'
            : type === 'error'
            ? 'fas fa-exclamation-circle'
            : 'fas fa-info-circle';
        const text = document.createElement('span');
        text.textContent = message;
        notification.appendChild(icon);
        notification.appendChild(text);
        container.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
}

// Add overlay logic at the end of the file
function showImageOverlay(imageUrl) {
    const overlay = document.getElementById('image_overlay');
    const overlayImg = document.getElementById('overlay_image');
    if (overlay && overlayImg) {
        overlayImg.src = imageUrl;
        overlay.classList.remove('hidden');
    }
}
function closeImageOverlay() {
    const overlay = document.getElementById('image_overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        document.getElementById('overlay_image').src = '';
    }
}

// Initialize RegistrationReview when DOM is ready
let registrationReview;
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadRegistrations();
    const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo'));
    const avatarElement = document.querySelector('.user-avatar.dynamic-avatar');
    if (tellerInfo) {
        let fullName = '';
        if (tellerInfo.first_name && tellerInfo.last_name) {
            fullName = tellerInfo.first_name + ' ' + tellerInfo.last_name;
        } else if (tellerInfo.name) {
            fullName = tellerInfo.name;
        }
        if (avatarElement && fullName) {
            const initial = fullName.trim().charAt(0).toUpperCase();
            avatarElement.textContent = initial;
        }
    }
    const overlay = document.getElementById('image_overlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeImageOverlay();
            }
        });
    }
});

window.handleAction = handleAction;
window.viewDetails = viewDetails;
window.goBack = goBack;
window.goToPage = goToPage;
window.showImageOverlay = showImageOverlay;
window.closeImageOverlay = closeImageOverlay; 
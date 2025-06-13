// DOM Elements
const statusFilter = document.getElementById('status_filter');
const dateFrom = document.getElementById('date_from');
const dateTo = document.getElementById('date_to');
const applicationsGrid = document.querySelector('.applications-grid');
const modal = document.getElementById('application_modal');
const closeModalBtn = document.querySelector('.close-modal');
const approveBtn = document.querySelector('.btn.approve');
const rejectBtn = document.querySelector('.btn.reject');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadApplications();
    setupEventListeners();
});

function setupEventListeners() {
    statusFilter.addEventListener('change', filterApplications);
    dateFrom.addEventListener('change', filterApplications);
    dateTo.addEventListener('change', filterApplications);
    closeModalBtn.addEventListener('click', closeModal);
    approveBtn.addEventListener('click', () => handleApplicationDecision('approve'));
    rejectBtn.addEventListener('click', () => handleApplicationDecision('reject'));
}

// Functions
function loadApplications(filters = {}) {
    // In real implementation, this would fetch data from an API
    const applications = filterApplicationsData(sampleApplications, filters);
    renderApplications(applications);
}

function filterApplicationsData(applications, filters) {
    return applications.filter(app => {
        if (filters.status && filters.status !== 'all' && app.status !== filters.status) return false;
        if (filters.dateFrom && new Date(app.dateSubmitted) < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && new Date(app.dateSubmitted) > new Date(filters.dateTo)) return false;
        return true;
    });
}

function renderApplications(applications) {
    applicationsGrid.innerHTML = applications.map(app => `
        <div class="application-card" onclick="openApplicationDetails(${app.id})">
            <div class="application-header">
                <div class="application-name">${app.name}</div>
                <div class="application-status status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</div>
            </div>
            <div class="application-details">
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${app.email}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">${app.phone}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Account Type:</div>
                    <div class="detail-value">${app.accountType}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date Submitted:</div>
                    <div class="detail-value">${formatDate(app.dateSubmitted)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Initial Deposit:</div>
                    <div class="detail-value">₱${app.initialDeposit.toLocaleString()}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function filterApplications() {
    const filters = {
        status: statusFilter.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value
    };
    loadApplications(filters);
}

function openApplicationDetails(applicationId) {
    const application = sampleApplications.find(app => app.id === applicationId);
    if (!application) return;

    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = `
        <div class="modal-details">
            <h3>Personal Information</h3>
            <div class="detail-group">
                <div class="detail-row">
                    <div class="detail-label">Full Name:</div>
                    <div class="detail-value">${application.name}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${application.email}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">${application.phone}</div>
                </div>
            </div>

            <h3>Account Information</h3>
            <div class="detail-group">
                <div class="detail-row">
                    <div class="detail-label">Account Type:</div>
                    <div class="detail-value">${application.accountType}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Initial Deposit:</div>
                    <div class="detail-value">₱${application.initialDeposit.toLocaleString()}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date Submitted:</div>
                    <div class="detail-value">${formatDate(application.dateSubmitted)}</div>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    modal.dataset.applicationId = applicationId;
}

function closeModal() {
    modal.classList.remove('active');
    delete modal.dataset.applicationId;
}

function handleApplicationDecision(decision) {
    const applicationId = parseInt(modal.dataset.applicationId);
    const application = sampleApplications.find(app => app.id === applicationId);
    if (!application) return;

    // In real implementation, this would make an API call
    application.status = decision === 'approve' ? 'approved' : 'rejected';
    
    showNotification(`Application ${decision}d successfully`, 'success');
    loadApplications();
    closeModal();
}

function showNotification(message, type = 'success') {
    const notificationContainer = document.getElementById('notification_container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === modal) {
        closeModal();
    }
}; 
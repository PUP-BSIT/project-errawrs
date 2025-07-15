import { API_ENDPOINTS } from '/api_config.js';

const tellerManager = {
  currentPage: 1,
  pageSize: 6,
  totalTellers: 0,
  searchTerm: '',
  searchTimeout: null,
  currentOperation: 'create',

  init() {
    tellerManager.setupEventListeners();
    tellerManager.loadTellers();
  },

  setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search_teller');
    if (searchInput) {
      searchInput.addEventListener('input', (e) =>
        tellerManager.handleSearch(e)
      );
    }
    // Create teller button
    const createBtn = document.getElementById('create_teller_btn');
    if (createBtn) {
      createBtn.addEventListener('click', () =>
        tellerManager.showCreateModal()
      );
    }
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach((btn) => {
      btn.addEventListener('click', (e) =>
        tellerManager.closeModal(e.target.closest('.modal'))
      );
    });
    // Save teller
    const saveBtn = document.getElementById('save_btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () =>
        tellerManager.saveTeller()
      );
    }
    // Cancel button
    const cancelBtn = document.getElementById('cancel_btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () =>
        tellerManager.closeModal(document.getElementById('teller_modal'))
      );
    }
    // Success modal buttons
    const doneBtn = document.getElementById('done_btn');
    const createAnotherBtn = document.getElementById('create_another_btn');
    if (doneBtn) {
      doneBtn.addEventListener('click', () =>
        tellerManager.closeModal(document.getElementById('success_modal'))
      );
    }
    if (createAnotherBtn) {
      createAnotherBtn.addEventListener('click', () => {
        tellerManager.closeModal(document.getElementById('success_modal'));
        tellerManager.showCreateModal();
      });
    }
    // Logout
    const logoutBtn = document.getElementById('logout_btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) =>
        tellerManager.handleLogout(e)
      );
    }
    // Reset password modal buttons
    const resetPasswordModal = document.getElementById('reset_password_modal');
    const cancelResetBtn = document.getElementById('cancel_reset_btn');
    const confirmResetBtn = document.getElementById('confirm_reset_btn');
    if (cancelResetBtn) {
      cancelResetBtn.addEventListener('click', () =>
        tellerManager.closeModal(resetPasswordModal)
      );
    }
    // Close modal when clicking close button
    const closeResetBtn = resetPasswordModal?.querySelector('.close-btn');
    if (closeResetBtn) {
      closeResetBtn.addEventListener('click', () =>
        tellerManager.closeModal(resetPasswordModal)
      );
    }
    // Status change modal buttons
    const statusModal = document.getElementById('status_change_modal');
    const cancelStatusBtn = document.getElementById('cancel_status_btn');
    const closeStatusBtn = statusModal?.querySelector('.close-btn');
    if (cancelStatusBtn) {
      cancelStatusBtn.addEventListener('click', () =>
        tellerManager.closeModal(statusModal)
      );
    }
    if (closeStatusBtn) {
      closeStatusBtn.addEventListener('click', () =>
        tellerManager.closeModal(statusModal)
      );
    }
  },

  async loadTellers() {
    try {
      const container = document.getElementById('teller_cards');
      if (!container) return;
      container.classList.add('loading');
      const params = new URLSearchParams({
        page: tellerManager.currentPage,
        limit: tellerManager.pageSize,
        search: tellerManager.searchTerm,
      });
      const response = await fetch(
        `${API_ENDPOINTS.ADMIN_LIST_TELLERS}?${params}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch tellers: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        tellerManager.totalTellers = data.total || 0;
        const totalCountElement = document.getElementById('total_tellers_count');
        if (totalCountElement) {
          totalCountElement.textContent =
            tellerManager.totalTellers.toLocaleString();
        }
        tellerManager.displayTellers(data.tellers || []);
        tellerManager.updatePagination();
      } else {
        throw new Error(data.message || 'Failed to load tellers');
      }
    } catch (error) {
      console.error('Error loading tellers:', error);
      tellerManager.showToast(
        'Failed to load tellers. Please try again.',
        'error'
      );
    } finally {
      const container = document.getElementById('teller_cards');
      if (container) {
        container.classList.remove('loading');
      }
    }
  },

  displayTellers(tellers) {
    const container = document.getElementById('teller_cards');
    if (!container) return;
    if (tellers.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <p>No tellers found</p>
        </div>
      `;
      return;
    }
    const sortedTellers = [...tellers].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      if (a.status === b.status) return 0;
      return a.status === 'active' ? -1 : 1;
    });
    container.innerHTML = sortedTellers
      .map(
        (teller) => `
      <div class="teller-card">
        <div class="teller-header">
          <div class="teller-info">
            <h3>${teller.first_name} ${teller.last_name}</h3>
            <div class="teller-number">
              ${teller.teller_number || 'No Number Assigned'}
            </div>
          </div>
          <span class="status-badge ${
            teller.status === 'active'
              ? 'status-active'
              : teller.status === 'pending'
              ? 'status-pending'
              : 'status-inactive'
          }">
            ${teller.status}
          </span>
        </div>
        <div class="teller-details">
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${teller.email}</span>
          </div>
        </div>
        <div class="teller-actions">
          <button class="action-btn action-edit ${
            teller.status === 'pending' ? 'disabled' : ''
          }"
            onclick="$${
              teller.status === 'pending'
                ? 'return false;'
                : `tellerManager.editTeller(${teller.teller_id})`
            }"
            title="Edit" ${
              teller.status === 'pending' ? 'disabled' : ''
            }>
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn action-reset ${
            teller.status === 'pending' ? 'disabled' : ''
          }"
            onclick="$${
              teller.status === 'pending'
                ? 'return false;'
                : `tellerManager.resetPassword(${teller.teller_id})`
            }"
            title="Reset Password" ${
              teller.status === 'pending' ? 'disabled' : ''
            }>
            <i class="fas fa-key"></i>
          </button>
          <button class="action-btn ${
            teller.status === 'active' ? 'warning' : 'success'
          } ${teller.status === 'pending' ? 'disabled' : ''}"
            onclick="$${
              teller.status === 'pending'
                ? 'return false;'
                : `tellerManager.toggleTellerStatus(${teller.teller_id}, '${teller.status}')`
            }"
            title="$${
              teller.status === 'active' ? 'Deactivate' : 'Activate'
            }"
            ${teller.status === 'pending' ? 'disabled' : ''}>
            <i class="fas fa-power-off"></i>
          </button>
        </div>
      </div>
    `
      )
      .join('');
  },

  updatePagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    const totalPages = Math.ceil(
      tellerManager.totalTellers / tellerManager.pageSize
    );
    let html = '';
    html += `
      <button class="pagination-btn" ${
        tellerManager.currentPage <= 1 ? 'disabled' : ''
      }
        onclick="tellerManager.changePage(${tellerManager.currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
        Previous
      </button>
    `;
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      tellerManager.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (startPage > 1) {
      html += `<button onclick="tellerManager.changePage(1)">1</button>`;
      if (startPage > 2) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
    }
    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="pagination-btn ${
          i === tellerManager.currentPage ? 'active' : ''
        }"
          onclick="tellerManager.changePage(${i})">
          ${i}
        </button>
      `;
    }
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
      html += `<button onclick="tellerManager.changePage(${totalPages})">${totalPages}</button>`;
    }
    html += `
      <button class="pagination-btn" ${
        tellerManager.currentPage >= totalPages ? 'disabled' : ''
      }
        onclick="tellerManager.changePage(${tellerManager.currentPage + 1})">
        Next
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    container.innerHTML = html;
  },

  handleSearch(e) {
    if (tellerManager.searchTimeout) {
      clearTimeout(tellerManager.searchTimeout);
    }
    tellerManager.searchTerm = e.target.value.trim();
    tellerManager.searchTimeout = setTimeout(() => {
      tellerManager.currentPage = 1;
      tellerManager.loadTellers();
    }, 300);
  },

  showCreateModal() {
    const modal = document.getElementById('teller_modal');
    if (!modal) return;
    tellerManager.currentOperation = 'create';
    const form = document.getElementById('teller_form');
    if (form) {
      form.reset();
    }
    const tellerIdInput = document.getElementById('teller_id');
    if (tellerIdInput) {
      tellerIdInput.value = '';
    }
    const title = document.getElementById('modal_title');
    const saveBtn = document.getElementById('save_btn');
    if (title) {
      title.textContent = 'Create New Teller';
    }
    if (saveBtn) {
      saveBtn.textContent = 'Create Teller';
    }
    modal.classList.add('show');
  },

  async editTeller(tellerId) {
    try {
      tellerManager.currentOperation = 'edit';
      const response = await fetch(
        `${API_ENDPOINTS.ADMIN_GET_TELLER}/${tellerId}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch teller details');
      }
      const data = await response.json();
      if (data.success && data.teller) {
        const modal = document.getElementById('teller_modal');
        const form = document.getElementById('teller_form');
        if (modal && form) {
          document.getElementById('teller_id').value = data.teller.teller_id;
          document.getElementById('first_name').value = data.teller.first_name;
          document.getElementById('last_name').value = data.teller.last_name;
          document.getElementById('email').value = data.teller.email;
          document.getElementById('modal_title').textContent = 'Edit Teller';
          document.getElementById('save_btn').textContent = 'Update Teller';
          modal.classList.add('show');
        }
      } else {
        throw new Error(data.message || 'Failed to load teller details');
      }
    } catch (error) {
      console.error('Error loading teller details:', error);
      tellerManager.showToast(error.message, 'error');
    }
  },

  async saveTeller() {
    try {
      const form = document.getElementById('teller_form');
      if (!form) return;
      const tellerId = document.getElementById('teller_id').value;
      const isEdit = tellerManager.currentOperation === 'edit';
      const formData = {
        first_name: document.getElementById('first_name').value.trim(),
        last_name: document.getElementById('last_name').value.trim(),
        email: document.getElementById('email').value.trim(),
      };
      if (!formData.first_name || !formData.last_name || !formData.email) {
        tellerManager.showToast('Please fill in all fields', 'error');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        tellerManager.showToast('Please enter a valid email address', 'error');
        return;
      }
      if (isEdit) {
        formData.teller_id = tellerId;
      }
      tellerManager.setSaveButtonLoading(true);
      const url = isEdit
        ? `${API_ENDPOINTS.ADMIN_UPDATE_TELLER}/${tellerId}`
        : API_ENDPOINTS.ADMIN_CREATE_TELLER;
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Failed to parse response: ${responseText}`);
      }
      if (data.success) {
        tellerManager.closeModal(document.getElementById('teller_modal'));
        tellerManager.showSuccessModal(data.teller, isEdit);
        if (!isEdit) {
          tellerManager.showToast(
            "A password setup link has been sent to the teller's email address",
            'success'
          );
        }
        tellerManager.loadTellers();
      } else {
        throw new Error(
          data.message || `Failed to ${isEdit ? 'update' : 'create'} teller`
        );
      }
    } catch (error) {
      console.error('Error saving teller:', error);
      tellerManager.showToast(error.message, 'error');
    } finally {
      tellerManager.setSaveButtonLoading(false);
    }
  },

  setSaveButtonLoading(isLoading) {
    const saveBtn = document.getElementById('save_btn');
    if (!saveBtn) return;
    const isEdit = tellerManager.currentOperation === 'edit';
    if (isLoading) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = isEdit
        ? '<i class="fas fa-spinner fa-spin"></i> Saving...'
        : '<i class="fas fa-spinner fa-spin"></i> Creating...';
    } else {
      saveBtn.disabled = false;
      saveBtn.innerHTML = isEdit ? 'Update Teller' : 'Create Teller';
    }
  },

  setResetButtonLoading(isLoading) {
    const resetBtn = document.getElementById('confirm_reset_btn');
    if (!resetBtn) return;
    if (isLoading) {
      resetBtn.disabled = true;
      resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    } else {
      resetBtn.disabled = false;
      resetBtn.innerHTML = 'Reset Password';
    }
  },

  setResetModalLoading(isLoading, completeMessage) {
    const overlay = document.getElementById('reset_loading_overlay');
    const loadingText = document.getElementById('reset_loading_text');
    const modal = document.getElementById('reset_password_modal');
    if (!overlay || !loadingText || !modal) return;
    if (isLoading) {
      loadingText.textContent = 'Processing...';
      overlay.classList.add('show');
    } else {
      loadingText.textContent = completeMessage || 'Complete';
      setTimeout(() => {
        overlay.classList.remove('show');
        tellerManager.closeModal(modal);
      }, 1000);
    }
  },

  setStatusModalLoading(isLoading, completeMessage) {
    const overlay = document.getElementById('status_loading_overlay');
    const loadingText = document.getElementById('status_loading_text');
    const modal = document.getElementById('status_change_modal');
    if (!overlay || !loadingText || !modal) return;
    const header = modal.querySelector('.modal-header');
    const body = modal.querySelector('.modal-body');
    const footer = modal.querySelector('.modal-footer');
    if (isLoading) {
      loadingText.textContent = 'Processing...';
      overlay.classList.add('show');
      if (header) header.classList.add('modal-content-hidden');
      if (body) body.classList.add('modal-content-hidden');
      if (footer) footer.classList.add('modal-content-hidden');
    } else {
      loadingText.textContent = completeMessage || 'Complete';
      setTimeout(() => {
        overlay.classList.remove('show');
        tellerManager.closeModal(modal);
        if (header) header.classList.remove('modal-content-hidden');
        if (body) body.classList.remove('modal-content-hidden');
        if (footer) footer.classList.remove('modal-content-hidden');
      }, 1000);
    }
  },

  async resetPassword(tellerId) {
    const modal = document.getElementById('reset_password_modal');
    if (!modal) return;
    modal.classList.add('show');
    const confirmBtn = document.getElementById('confirm_reset_btn');
    if (confirmBtn) {
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      const handleConfirm = async () => {
        try {
          tellerManager.setResetButtonLoading(true);
          tellerManager.setResetModalLoading(true);
          const response = await fetch(
            `${API_ENDPOINTS.ADMIN_SEND_TELLER_RESET_EMAIL}/${tellerId}/reset-password`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            }
          );
          if (!response.ok) {
            throw new Error('Failed to send reset email');
          }
          const data = await response.json();
          if (data.success) {
            tellerManager.setResetModalLoading(
              false,
              'Reset Password Complete'
            );
            tellerManager.showToast(
              "A password reset link has been sent to the teller's email address",
              'success'
            );
          } else {
            throw new Error(data.message || 'Failed to send reset email');
          }
        } catch (error) {
          console.error('Error resetting password:', error);
          tellerManager.showToast(error.message, 'error');
          tellerManager.setResetModalLoading(false, 'Complete');
        } finally {
          tellerManager.setResetButtonLoading(false);
        }
      };
      newConfirmBtn.addEventListener('click', handleConfirm);
    }
  },

  async toggleTellerStatus(tellerId, currentStatus) {
    const modal = document.getElementById('status_change_modal');
    const modalTitle = document.getElementById('status_modal_title');
    const modalMessage = document.getElementById('status_modal_message');
    const confirmBtn = document.getElementById('confirm_status_btn');
    const warningIcon = modal?.querySelector('.warning-icon');
    const modalHeader = modal?.querySelector('.modal-header');
    if (
      !modal ||
      !modalTitle ||
      !modalMessage ||
      !confirmBtn ||
      !warningIcon ||
      !modalHeader
    )
      return;
    const isActivating =
      currentStatus === 'inactive' || currentStatus === 'pending';
    modalTitle.textContent = isActivating
      ? 'Activate Teller'
      : 'Deactivate Teller';
    modalMessage.textContent = isActivating
      ? "Are you sure you want to activate this teller's account?"
      : "Are you sure you want to deactivate this teller's account?";
    confirmBtn.textContent = isActivating
      ? 'Activate Account'
      : 'Deactivate Account';
    confirmBtn.className = isActivating ? 'btn-success' : 'btn-danger';
    warningIcon.className = `warning-icon ${
      isActivating ? 'activate' : 'deactivate'
    }`;
    modalHeader.className = `modal-header warning ${
      isActivating ? 'activate' : 'deactivate'
    }`;
    modal.classList.add('show');
    const handleConfirm = async () => {
      try {
        tellerManager.setStatusModalLoading(true);
        const response = await fetch(
          `${API_ENDPOINTS.ADMIN_TOGGLE_TELLER_STATUS}/${tellerId}/toggle-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to update status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          tellerManager.showToast(
            `Teller ${
              data.status === 'active' ? 'activated' : 'deactivated'
            } successfully`,
            'success'
          );
          await tellerManager.loadTellers();
          tellerManager.setStatusModalLoading(
            false,
            data.status === 'active'
              ? 'Activation Complete'
              : 'Deactivation Complete'
          );
        } else {
          throw new Error(data.message || 'Failed to update teller status');
        }
      } catch (error) {
        console.error('Error toggling teller status:', error);
        tellerManager.showToast(error.message, 'error');
        tellerManager.setStatusModalLoading(false, 'Complete');
      } finally {
        confirmBtn.removeEventListener('click', handleConfirm);
      }
    };
    confirmBtn.addEventListener('click', handleConfirm);
  },

  showSuccessModal(teller, isEdit) {
    const modal = document.getElementById('success_modal');
    if (!modal) return;
    const message = isEdit
      ? 'Teller information updated successfully!'
      : 'Teller account created successfully! A password setup link has been sent to their email.';
    document.getElementById('success_message').textContent = message;
    document.getElementById('success_teller_number').textContent =
      teller.teller_number;
    document.getElementById('success_teller_name').textContent =
      `${teller.first_name} ${teller.last_name}`;
    document.getElementById('success_teller_email').textContent =
      teller.email;
    const createAnotherBtn = document.getElementById('create_another_btn');
    if (createAnotherBtn) {
      createAnotherBtn.style.display = isEdit ? 'none' : 'block';
    }
    modal.classList.add('show');
  },

  closeModal(modal) {
    if (modal) {
      modal.classList.remove('show');
    }
  },

  showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="${tellerManager.getToastIcon(type)}"></i>
      <span>${message}</span>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    container.appendChild(toast);
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.remove();
      });
    }
    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  },

  getToastIcon(type) {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      default:
        return 'fas fa-info-circle';
    }
  },

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },

  changePage(page) {
    tellerManager.currentPage = page;
    tellerManager.loadTellers();
  },

  async handleLogout(e) {
    e.preventDefault();
    try {
      await fetch(API_ENDPOINTS.USER_LOGOUT, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {}
    sessionStorage.clear();
    window.location.href = '/login';
  },
};

window.tellerManager = tellerManager;

document.addEventListener('DOMContentLoaded', () => tellerManager.init());

(async function () {
  try {
    if (!API_ENDPOINTS?.ADMIN_SESSION_CHECK) {
      return;
    }
    const res = await fetch(API_ENDPOINTS.ADMIN_SESSION_CHECK, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!data.success) {
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    }
  } catch (e) {
    setTimeout(() => {
      window.location.href = '/login';
    }, 3000);
  }
})();

window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});
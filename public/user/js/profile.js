// Constants and Configuration
const CONFIG = {
    ENDPOINTS: {
        SESSION_CHECK: API_ENDPOINTS.SESSION_CHECK,
        UPDATE_PROFILE: API_ENDPOINTS.UPDATE_PROFILE,
        GET_ACCOUNTS: API_ENDPOINTS.GET_ACCOUNTS,
        LOGOUT: API_ENDPOINTS.LOGOUT
    },
    NOTIFICATION: {
        TIMEOUT: 3000,
        TYPES: {
            SUCCESS: 'success',
            ERROR: 'error',
            INFO: 'info',
            WARNING: 'warning'
        }
    },
    VALIDATION: {
        MIN_PASSWORD_LENGTH: 8,
        PASSWORD_PATTERNS: {
            UPPERCASE: /[A-Z]/,
            LOWERCASE: /[a-z]/,
            NUMBER: /[0-9]/
        }
    }
};

// Performance Monitoring
const PerformanceMonitor = {
    metrics: new Map(),
    start: (label) => {
        console.time(label);
        PerformanceMonitor.metrics.set(label, performance.now());
    },
    end: (label) => {
        console.timeEnd(label);
        const startTime = PerformanceMonitor.metrics.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            PerformanceMonitor.metrics.delete(label);
            return duration;
        }
        return 0;
    }
};

// Error Handling
const ErrorHandler = {
    handle: (error, context) => {
        console.error(`Error in ${context}:`, error);
        NotificationManager.show(
            `An error occurred while ${context}. Please try again.`,
            CONFIG.NOTIFICATION.TYPES.ERROR
        );
    },
    isNetworkError: (error) => error.name === 'TypeError' && error.message.includes('fetch'),
    isValidationError: (error) => error.name === 'ValidationError'
};

// Notification Management
const NotificationManager = {
    queue: [],
    show: (message, type = CONFIG.NOTIFICATION.TYPES.INFO) => {
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        
        const icon = {
            [CONFIG.NOTIFICATION.TYPES.SUCCESS]: 'fas fa-check-circle',
            [CONFIG.NOTIFICATION.TYPES.ERROR]: 'fas fa-times-circle',
            [CONFIG.NOTIFICATION.TYPES.INFO]: 'fas fa-info-circle',
            [CONFIG.NOTIFICATION.TYPES.WARNING]: 'fas fa-exclamation-circle'
        }[type] || 'fas fa-bell';

        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;

        const container = DOM.notificationContainer;
        if (!container) return;

        container.appendChild(notification);
        const timeoutId = setTimeout(() => {
            notification.remove();
            clearTimeout(timeoutId);
        }, CONFIG.NOTIFICATION.TIMEOUT);

        NotificationManager.queue.push({ notification, timeoutId });
    },
    clearAll: () => {
        NotificationManager.queue.forEach(({ notification, timeoutId }) => {
            notification.remove();
            clearTimeout(timeoutId);
        });
        NotificationManager.queue = [];
    }
};

// Form Validation
const FormValidator = {
    validatePassword: (password, confirmPassword) => {
        if (!password) return true; // Allow empty password (no change)

        const { PASSWORD_PATTERNS, MIN_PASSWORD_LENGTH } = CONFIG.VALIDATION;
        const hasUppercase = PASSWORD_PATTERNS.UPPERCASE.test(password);
        const hasLowercase = PASSWORD_PATTERNS.LOWERCASE.test(password);
        const hasNumber = PASSWORD_PATTERNS.NUMBER.test(password);
        const hasMinLength = password.length >= MIN_PASSWORD_LENGTH;

        // Calculate password strength
        let strength = 0;
        if (hasMinLength) strength++;
        if (hasUppercase) strength++;
        if (hasLowercase) strength++;
        if (hasNumber) strength++;

        // Update password strength indicator
        const strengthBar = document.querySelector('.password-strength-bar');
        if (strengthBar) {
            strengthBar.className = 'password-strength-bar';
            if (strength >= 4) strengthBar.classList.add('strong');
            else if (strength >= 3) strengthBar.classList.add('medium');
            else strengthBar.classList.add('weak');
        }

        if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
            const requirements = [];
            if (!hasMinLength) requirements.push('at least 8 characters');
            if (!hasUppercase) requirements.push('an uppercase letter');
            if (!hasLowercase) requirements.push('a lowercase letter');
            if (!hasNumber) requirements.push('a number');

            NotificationManager.show(
                `Password must include ${requirements.join(', ')}.`,
                CONFIG.NOTIFICATION.TYPES.ERROR
            );
            return false;
        }

        if (password !== confirmPassword) {
            NotificationManager.show(
                'Passwords do not match',
                CONFIG.NOTIFICATION.TYPES.ERROR
            );
            return false;
        }

        return true;
    },
    validateProfileData: (data) => {
        const required = ['first_name', 'last_name', 'phone_number'];
        const missing = required.filter(field => !data[field]?.trim());
        
        // Reset all form fields to default state
        document.querySelectorAll('.form-input').forEach(input => {
            input.classList.remove('error', 'success');
        });

        if (missing.length > 0) {
            // Mark missing fields with error class
            missing.forEach(field => {
                const input = document.getElementById(`edit_${field}`);
                if (input) input.classList.add('error');
            });

            NotificationManager.show(
                `Please fill in all required fields: ${missing.map(field => field.replace('_', ' ')).join(', ')}`,
                CONFIG.NOTIFICATION.TYPES.ERROR
            );
            return false;
        }

        // Phone number validation
        // Accepts +639XXXXXXXXX, 09XXXXXXXXX, or 639XXXXXXXXX
        let normalizedPhone = data.phone_number.trim();
        // Remove all non-digit except leading +
        normalizedPhone = normalizedPhone.replace(/[^\d+]/g, '');
        if (normalizedPhone.startsWith('+63')) {
            normalizedPhone = '0' + normalizedPhone.substring(3);
        } else if (normalizedPhone.startsWith('63')) {
            normalizedPhone = '0' + normalizedPhone.substring(2);
        }
        // Now normalizedPhone should be 09XXXXXXXXX
        const phoneRegex = /^09\d{9}$/;
        if (!phoneRegex.test(normalizedPhone)) {
            const phoneInput = document.getElementById('edit_phone_number');
            if (phoneInput) phoneInput.classList.add('error');
            NotificationManager.show(
                'Please enter a valid Philippine phone number (e.g. 09XXXXXXXXX, +639XXXXXXXXX, or 639XXXXXXXXX)',
                CONFIG.NOTIFICATION.TYPES.ERROR
            );
            return false;
        }
        // Use normalizedPhone for sending to backend
        data.phone_number = normalizedPhone;

        // Mark all fields as success
        required.forEach(field => {
            const input = document.getElementById(`edit_${field}`);
            if (input) input.classList.add('success');
        });

        return true;
    }
};

// API Service
const ApiService = {
    async fetch(endpoint, options = {}) {
        PerformanceMonitor.start(`API:${endpoint}`);
        try {
            const response = await fetch(`${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            ErrorHandler.handle(error, `API call to ${endpoint}`);
            throw error;
        } finally {
            PerformanceMonitor.end(`API:${endpoint}`);
        }
    },
    
    async getProfile() {
        return ApiService.fetch(CONFIG.ENDPOINTS.SESSION_CHECK);
    },
    
    async updateProfile(data) {
        return ApiService.fetch(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async logout() {
        return ApiService.fetch(CONFIG.ENDPOINTS.LOGOUT, {
            method: 'POST'
        });
    }
};

// State Management
const StateManager = {
    state: {
        userData: {},
        isFormDirty: false,
        isLoading: false,
        idImageFile: null // Added for file upload
    },
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    },
    
    listeners: new Set(),
    
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    },
    
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }
};

// DOM Cache
const DOM = {
    userAvatarContainer: document.getElementById('user_avatar_container'),
    editProfileIcon: document.getElementById('edit_profile_icon'),
    userNameElement: document.getElementById('user_name'),
    editFirstNameInput: document.getElementById('edit_first_name'),
    editLastNameInput: document.getElementById('edit_last_name'),
    editUsernameInput: document.getElementById('edit_username'),
    editPasswordInput: document.getElementById('edit_password'),
    editConfirmPasswordInput: document.getElementById('edit_confirm_password'),
    editPhoneNumberInput: document.getElementById('edit_phone_number'),
    saveProfileButton: document.getElementById('save_profile_button'),
    resetProfileButton: document.getElementById('reset_profile_button'),
    notificationContainer: document.querySelector('.notification-container'),
    logoutButton: document.getElementById('logout_btn'),
    editEmailInput: document.getElementById('edit_email'),
    editDateOfBirthInput: document.getElementById('edit_date_of_birth'),
    editNationalityInput: document.getElementById('edit_nationality'),
    editStreetInput: document.getElementById('edit_street'),
    editCityInput: document.getElementById('edit_city'),
    editZipCodeInput: document.getElementById('edit_zip_code'),
    editCountryInput: document.getElementById('edit_country'),
    editIdTypeInput: document.getElementById('edit_id_type'),
    editIdImageInput: document.getElementById('edit_id_image'),
    viewIdImageBtn: document.getElementById('view_id_image_btn'),
    updateIdImageBtn: document.getElementById('update_id_image_btn'),
    updateIdImageInput: document.getElementById('update_id_image_input'),
    idImageModal: document.getElementById('id-image-modal'),
    idImagePreview: document.getElementById('id-image-preview'),
    closeIdImageModal: document.getElementById('close-id-image-modal')
};

// Profile Management
const ProfileManager = {
    async fetchProfile() {
        StateManager.setState({ isLoading: true });
        try {
            const data = await ApiService.getProfile();
            
            if (data.success && data.authenticated && data.user) {
                StateManager.setState({ 
                    userData: data.user,
                    isFormDirty: false
                });
                this.populateForm();
                this.updateDisplay();
            } else {
                // Handle authentication failure or missing user data
                NotificationManager.show(
                    data.error || 'Session expired or invalid. Please log in again.',
                    CONFIG.NOTIFICATION.TYPES.ERROR
                );
                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = ROUTES.LOGIN;
                }, 2000);
            }
        } catch (error) {
            ErrorHandler.handle(error, 'fetching profile');
            this.disableForm();
        } finally {
            StateManager.setState({ isLoading: false });
        }
    },

    updateDisplay() {
        const { userData } = StateManager.state;
        const { userNameElement, userAvatarContainer } = DOM;
        
        if (!userNameElement) {
            console.error('userNameElement not found');
            return;
        }
        if (!userAvatarContainer) {
            console.error('userAvatarContainer not found');
            return;
        }

        const fullName = userData.first_name && userData.last_name
            ? `${userData.first_name} ${userData.last_name}`.trim()
            : 'User';
        
        userNameElement.textContent = fullName;
        userAvatarContainer.textContent = fullName.charAt(0).toUpperCase();
    },

    populateForm() {
        const { userData } = StateManager.state;
        const {
            editFirstNameInput,
            editLastNameInput,
            editUsernameInput,
            editPhoneNumberInput,
            editPasswordInput,
            editConfirmPasswordInput,
            editEmailInput,
            editDateOfBirthInput,
            editNationalityInput,
            editStreetInput,
            editCityInput,
            editZipCodeInput,
            editCountryInput
            // Removed: editIdTypeInput, editIdImageInput
        } = DOM;

        if (!editFirstNameInput || !editLastNameInput || !editUsernameInput || 
            !editPhoneNumberInput || !userData) {
            console.error('Required form elements or user data missing for population');
            return;
        }

        editUsernameInput.value = userData.username || '';
        editFirstNameInput.value = userData.first_name || '';
        editLastNameInput.value = userData.last_name || '';
        editDateOfBirthInput.value = userData.date_of_birth || '';
        editNationalityInput.value = userData.nationality || '';
        // Removed: editIdTypeInput.value = userData.id_type || '';
        // Removed: editIdImageInput.value = userData.id_image || '';
        editEmailInput.value = userData.email || '';
        editPhoneNumberInput.value = userData.phone_number || '';
        editStreetInput.value = userData.street || '';
        editCityInput.value = userData.city || '';
        editZipCodeInput.value = userData.zip_code || '';
        editCountryInput.value = userData.country || '';
        
        if (editPasswordInput) editPasswordInput.value = '';
        if (editConfirmPasswordInput) editConfirmPasswordInput.value = '';
    },

    disableForm() {
        const formElements = [
            DOM.editFirstNameInput,
            DOM.editLastNameInput,
            DOM.editUsernameInput,
            DOM.editPasswordInput,
            DOM.editConfirmPasswordInput,
            DOM.editPhoneNumberInput,
            DOM.saveProfileButton,
            DOM.resetProfileButton
        ];

        formElements.forEach(element => {
            if (element) element.disabled = true;
        });
    },

    clearPasswordFields() {
        if (DOM.editPasswordInput) DOM.editPasswordInput.value = '';
        if (DOM.editConfirmPasswordInput) DOM.editConfirmPasswordInput.value = '';
    },

    async handleSave() {
        const {
            editFirstNameInput,
            editLastNameInput,
            editUsernameInput,
            editPasswordInput,
            editConfirmPasswordInput,
            editPhoneNumberInput,
            editEmailInput,
            editDateOfBirthInput,
            editNationalityInput,
            editStreetInput,
            editCityInput,
            editZipCodeInput,
            editCountryInput,
            editIdTypeInput,
            editIdImageInput
        } = DOM;

        const updatedProfileData = {
            email: DOM.editEmailInput?.value.trim() || '',
            phone_number: DOM.editPhoneNumberInput?.value.trim() || '',
            street: DOM.editStreetInput?.value.trim() || '',
            city: DOM.editCityInput?.value.trim() || '',
            zip_code: DOM.editZipCodeInput?.value.trim() || '',
            country: DOM.editCountryInput?.value.trim() || '',
            password: DOM.editPasswordInput?.value.trim() || null,
            confirm_password: DOM.editConfirmPasswordInput?.value.trim() || null
        };

        if (!FormValidator.validateProfileData(updatedProfileData)) {
            return;
        }

        if (!FormValidator.validatePassword(
            updatedProfileData.password,
            updatedProfileData.confirm_password
        )) {
            this.clearPasswordFields();
            return;
        }

        // Show confirmation modal before submitting
        const modal = document.getElementById('profile-confirm-modal');
        const passwordInput = document.getElementById('profile_confirm_password');
        const errorDiv = document.getElementById('profile-confirm-error');
        const confirmBtn = document.getElementById('profile_confirm_btn');
        const cancelBtn = document.getElementById('profile_cancel_btn');
        if (!modal || !passwordInput || !confirmBtn || !cancelBtn) {
            NotificationManager.show('Confirmation modal not found.', CONFIG.NOTIFICATION.TYPES.ERROR);
            return;
        }
        passwordInput.value = '';
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        modal.classList.remove('hidden');
        passwordInput.focus();

        // Handler for confirm
        const onConfirm = async () => {
            const currentPassword = passwordInput.value.trim();
            if (!currentPassword) {
                errorDiv.textContent = 'Please enter your current password.';
                errorDiv.style.display = 'block';
                return;
            }
            // Attach current password to payload
            updatedProfileData.current_password = currentPassword;
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            await ProfileManager.submitProfileUpdate(updatedProfileData);
        };
        // Handler for cancel
        const onCancel = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    },

    async submitProfileUpdate(updatedProfileData) {
        StateManager.setState({ isLoading: true });
        try {
            let response;
            if (StateManager.state.idImageFile) {
                // Use FormData for file upload
                const formData = new FormData();
                for (const key in updatedProfileData) {
                    formData.append(key, updatedProfileData[key]);
                }
                formData.append('id_image', StateManager.state.idImageFile);
                response = await fetch(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
            } else {
                // Use JSON for normal update
                response = await fetch(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
                    method: 'POST',
                    body: JSON.stringify(updatedProfileData),
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
            }
            const data = await response.json();
            StateManager.state.idImageFile = null; // Reset after upload
            if (data.success) {
                NotificationManager.show(
                    'Profile updated successfully!',
                    CONFIG.NOTIFICATION.TYPES.SUCCESS
                );
                StateManager.setState({
                    userData: { ...StateManager.state.userData, ...response.user },
                    isFormDirty: false
                });
                this.updateDisplay();
                this.clearPasswordFields();
            } else {
                NotificationManager.show(
                    data.error || 'Failed to update profile',
                    CONFIG.NOTIFICATION.TYPES.ERROR
                );
            }
        } catch (error) {
            ErrorHandler.handle(error, 'updating profile');
        } finally {
            StateManager.setState({ isLoading: false });
        }
    },

    handleCancel() {
        this.populateForm(); // Restore original data
        this.clearPasswordFields();
        StateManager.setState({ isFormDirty: false });
        NotificationManager.show('Changes discarded', CONFIG.NOTIFICATION.TYPES.INFO);
    },

    init() {
        this.fetchProfile();

        // Attach event listeners
        DOM.saveProfileButton.addEventListener('click', this.handleSave.bind(this));
        DOM.resetProfileButton.addEventListener('click', this.handleCancel.bind(this));
        
        // Listen for input changes to enable/disable save button
        const formInputs = document.querySelectorAll('.form-input');
        formInputs.forEach(input => {
            input.addEventListener('input', () => StateManager.setState({ isFormDirty: true }));
        });
        
        // Password visibility toggles
        const togglePasswordButtons = document.querySelectorAll('.toggle-password');
        togglePasswordButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.target;
                const passwordInput = document.getElementById(targetId);
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    e.currentTarget.classList.remove('fa-eye');
                    e.currentTarget.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    e.currentTarget.classList.remove('fa-eye-slash');
                    e.currentTarget.classList.add('fa-eye');
                }
            });
        });

        // ID Image View button logic
        if (DOM.viewIdImageBtn) {
            DOM.viewIdImageBtn.onclick = function() {
                const userData = StateManager.state.userData;
                if (userData && userData.id_image) {
                    DOM.idImagePreview.src = `/src/api/user/uploads/registration/${userData.id_image}`;
                    DOM.idImageModal.classList.remove('hidden');
                } else {
                    NotificationManager.show('No ID image uploaded.', CONFIG.NOTIFICATION.TYPES.INFO);
                }
            };
        }
        if (DOM.closeIdImageModal) {
            DOM.closeIdImageModal.onclick = function() {
                DOM.idImageModal.classList.add('hidden');
                DOM.idImagePreview.src = '';
            };
        }
        // ID Image Update button logic
        if (DOM.updateIdImageBtn && DOM.updateIdImageInput) {
            DOM.updateIdImageBtn.onclick = function() {
                DOM.updateIdImageInput.click();
            };
            DOM.updateIdImageInput.onchange = function() {
                const file = DOM.updateIdImageInput.files[0];
                if (file) {
                    StateManager.state.idImageFile = file;
                    NotificationManager.show('ID image selected. Click Save Changes to upload.', CONFIG.NOTIFICATION.TYPES.INFO);
                }
            };
        }
    }
};

// Modal DOM elements for Update My ID
const UpdateIdModal = {
    modal: document.getElementById('update-id-modal'),
    idType: document.getElementById('modal_id_type'),
    fileInput: document.getElementById('modal_id_image_input'),
    uploadBtn: document.getElementById('modal_upload_id_btn'),
    confirmBtn: document.getElementById('modal_confirm_id_btn'),
    cancelBtn: document.getElementById('modal_cancel_id_btn'),
    previewImg: document.getElementById('modal_id_image_preview'),
    passwordGroup: document.getElementById('modal_password_group'),
    passwordInput: document.getElementById('modal_current_password'),
    errorDiv: document.getElementById('modal_id_error'),
    selectedFile: null
};

// On open, reset modal state
if (DOM.updateIdImageBtn) {
    DOM.updateIdImageBtn.onclick = function() {
        const userData = StateManager.state.userData;
        if (userData && userData.id_type) {
            UpdateIdModal.idType.value = userData.id_type;
        } else {
            UpdateIdModal.idType.value = 'passport';
        }
        UpdateIdModal.fileInput.value = '';
        UpdateIdModal.previewImg.classList.add('hide');
        UpdateIdModal.previewImg.classList.remove('show');
        UpdateIdModal.selectedFile = null;
        UpdateIdModal.passwordGroup.classList.add('hide');
        UpdateIdModal.passwordGroup.classList.remove('show');
        UpdateIdModal.passwordInput.value = '';
        UpdateIdModal.uploadBtn.classList.remove('hide');
        UpdateIdModal.confirmBtn.classList.add('hide');
        UpdateIdModal.errorDiv.classList.add('hide');
        UpdateIdModal.errorDiv.textContent = '';
        UpdateIdModal.modal.classList.remove('hidden');
    };
}

// Cancel button closes modal
if (UpdateIdModal.cancelBtn) {
    UpdateIdModal.cancelBtn.onclick = function() {
        UpdateIdModal.modal.classList.add('hidden');
        UpdateIdModal.fileInput.value = '';
        UpdateIdModal.previewImg.classList.add('hide');
        UpdateIdModal.previewImg.classList.remove('show');
        UpdateIdModal.selectedFile = null;
        UpdateIdModal.passwordGroup.classList.add('hide');
        UpdateIdModal.passwordGroup.classList.remove('show');
        UpdateIdModal.passwordInput.value = '';
        UpdateIdModal.uploadBtn.classList.remove('hide');
        UpdateIdModal.confirmBtn.classList.add('hide');
        UpdateIdModal.errorDiv.classList.add('hide');
        UpdateIdModal.errorDiv.textContent = '';
    };
}

// File input change: store file and show preview
if (UpdateIdModal.fileInput) {
    UpdateIdModal.fileInput.onchange = function() {
        const file = UpdateIdModal.fileInput.files[0];
        if (file) {
            UpdateIdModal.selectedFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                UpdateIdModal.previewImg.src = e.target.result;
                UpdateIdModal.previewImg.classList.remove('hide');
                UpdateIdModal.previewImg.classList.add('show');
            };
            reader.readAsDataURL(file);
        } else {
            UpdateIdModal.previewImg.classList.add('hide');
            UpdateIdModal.previewImg.classList.remove('show');
            UpdateIdModal.previewImg.src = '';
            UpdateIdModal.selectedFile = null;
        }
    };
}

// Upload button: show password field and confirm button
if (UpdateIdModal.uploadBtn) {
    UpdateIdModal.uploadBtn.onclick = function() {
        const idType = UpdateIdModal.idType.value;
        const file = UpdateIdModal.selectedFile;
        UpdateIdModal.errorDiv.classList.add('hide');
        UpdateIdModal.errorDiv.textContent = '';
        if (!idType) {
            UpdateIdModal.errorDiv.textContent = 'Please select an ID type.';
            UpdateIdModal.errorDiv.classList.remove('hide');
            return;
        }
        if (!file) {
            UpdateIdModal.errorDiv.textContent = 'Please select an ID image to upload.';
            UpdateIdModal.errorDiv.classList.remove('hide');
            return;
        }
        UpdateIdModal.passwordGroup.classList.remove('hide');
        UpdateIdModal.passwordGroup.classList.add('show');
        UpdateIdModal.confirmBtn.classList.remove('hide');
        UpdateIdModal.uploadBtn.classList.add('hide');
    };
}

// Confirm button: submit to backend
if (UpdateIdModal.confirmBtn) {
    UpdateIdModal.confirmBtn.onclick = async function() {
        const idType = UpdateIdModal.idType.value;
        const file = UpdateIdModal.selectedFile;
        const password = UpdateIdModal.passwordInput.value.trim();
        UpdateIdModal.errorDiv.classList.add('hide');
        UpdateIdModal.errorDiv.textContent = '';
        if (!password) {
            UpdateIdModal.errorDiv.textContent = 'Current password is required.';
            UpdateIdModal.errorDiv.classList.remove('hide');
            return;
        }
        const formData = new FormData();
        formData.append('id_type', idType);
        formData.append('id_image', file);
        formData.append('current_password', password);
        try {
            StateManager.setState({ isLoading: true });
            const response = await fetch(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                NotificationManager.show('ID updated successfully!', CONFIG.NOTIFICATION.TYPES.SUCCESS);
                UpdateIdModal.modal.classList.add('hidden');
                await ProfileManager.fetchProfile();
            } else {
                UpdateIdModal.errorDiv.textContent = data.error || 'Failed to update ID.';
                UpdateIdModal.errorDiv.classList.remove('hide');
            }
        } catch (error) {
            ErrorHandler.handle(error, 'updating ID');
        } finally {
            StateManager.setState({ isLoading: false });
        }
    };
}

// --- Multi-Step Profile Form Logic ---
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();

    // Multi-step form logic
    const steps = Array.from(document.querySelectorAll('.profile-form-step'));
    const progressSteps = Array.from(document.querySelectorAll('.progress-step'));
    const nextBtn = document.getElementById('profile_next_btn');
    const prevBtn = document.getElementById('profile_prev_btn');
    const saveBtn = document.getElementById('save_profile_button');
    const resetBtn = document.getElementById('reset_profile_button');
    let currentStep = 0;

    function showStep(step) {
        steps.forEach((el, idx) => {
            el.style.display = idx === step ? 'flex' : 'none';
            if (idx === step) el.classList.add('active');
            else el.classList.remove('active');
        });
        progressSteps.forEach((el, idx) => {
            if (idx === step) el.classList.add('active');
            else el.classList.remove('active');
        });
        prevBtn.style.display = step > 0 ? 'inline-flex' : 'none';
        nextBtn.style.display = step < steps.length - 1 ? 'inline-flex' : 'none';
        saveBtn.style.display = step === steps.length - 1 ? 'inline-flex' : 'none';
    }

    nextBtn.addEventListener('click', () => {
        if (currentStep < steps.length - 1) {
            currentStep++;
            showStep(currentStep);
        }
    });
    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });
    resetBtn.addEventListener('click', () => {
        currentStep = 0;
        showStep(currentStep);
        if (typeof ProfileManager.handleCancel === 'function') {
            ProfileManager.handleCancel();
        }
    });
    // On submit, stay on last step
    document.getElementById('profile_form_steps').addEventListener('submit', (e) => {
        showStep(steps.length - 1);
    });
    // Initial state
    showStep(currentStep);

    // --- MOBILE/TABLET TOPNAV DROPDOWN LOGIC (copied from dashboard) ---
    const hamburgerBtn = document.getElementById('hamburger_btn');
    const topnavDropdown = document.getElementById('topnav_dropdown');
    const logoutBtnMobile = document.getElementById('logout_btn_mobile');

    if (hamburgerBtn && topnavDropdown) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 1024) {
                topnavDropdown.classList.toggle('open');
            }
        });
        // Close dropdown when clicking a nav link or logout
        topnavDropdown.querySelectorAll('.nav-link, .logout-btn').forEach(el => {
            el.addEventListener('click', () => {
                topnavDropdown.classList.remove('open');
            });
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (topnavDropdown.classList.contains('open') && !topnavDropdown.contains(e.target) && e.target !== hamburgerBtn) {
                topnavDropdown.classList.remove('open');
            }
        });
    }
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', (event) => {
            event.preventDefault();
            handleLogout();
        });
    }
}); 

// --- Country Searchable Input Enhancement (No Dropdown, Just Search Input) ---
(function setupCountrySearchInput() {
    const countryInput = document.getElementById('edit_country');
    if (!countryInput) return;
    // Static country list (ISO 3166 common names)
    const staticCountries = [
        'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
        'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
        'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czechia',
        'Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic',
        'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
        'Fiji','Finland','France',
        'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
        'Haiti','Honduras','Hungary',
        'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
        'Jamaica','Japan','Jordan',
        'Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan',
        'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
        'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
        'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
        'Oman',
        'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
        'Qatar',
        'Romania','Russia','Rwanda',
        'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
        'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
        'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
        'Vanuatu','Vatican City','Venezuela','Vietnam',
        'Yemen',
        'Zambia','Zimbabwe'
    ];
    // Remove any previous wrapper or search input
    if (countryInput.parentNode.classList && countryInput.parentNode.classList.contains('country-search-wrapper')) {
        countryInput.parentNode.replaceWith(countryInput);
    }
    // Set input type and attributes
    countryInput.setAttribute('list', 'country-list-datalist');
    countryInput.setAttribute('autocomplete', 'on');
    // Create datalist for browser autocomplete
    let datalist = document.getElementById('country-list-datalist');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'country-list-datalist';
        document.body.appendChild(datalist);
    }
    datalist.innerHTML = '';
    staticCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        datalist.appendChild(option);
    });
})(); 
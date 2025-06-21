// Constants and Configuration
const CONFIG = {
    API: {
        BASE_URL: '/project-errawrs/src/api',
        ENDPOINTS: {
            PROFILE: '/auth/session_check.php',
            UPDATE: '/user/update_profile.php',
            LOGOUT: '/auth/logout.php'
        }
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
        const phoneRegex = /^09\d{9}$/;
        if (!phoneRegex.test(data.phone_number)) {
            const phoneInput = document.getElementById('edit_phone_number');
            if (phoneInput) phoneInput.classList.add('error');
            NotificationManager.show(
                'Please enter a valid 11-digit phone number starting with 09',
                CONFIG.NOTIFICATION.TYPES.ERROR
            );
            return false;
        }

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
            const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
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
        return ApiService.fetch('/auth/session_check.php');
    },
    
    async updateProfile(data) {
        return ApiService.fetch('/user/update_profile.php', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async logout() {
        return ApiService.fetch('/auth/logout.php', {
            method: 'POST'
        });
    }
};

// State Management
const StateManager = {
    state: {
        userData: {},
        isFormDirty: false,
        isLoading: false
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
    cancelEditButton: document.getElementById('cancel_edit_button'),
    notificationContainer: document.querySelector('.notification-container'),
    logoutButton: document.getElementById('logout_btn')
};

// Profile Management
const ProfileManager = {
    async fetchProfile() {
        StateManager.setState({ isLoading: true });
        console.log('Fetching profile...');
        try {
            const data = await ApiService.getProfile();
            console.log('API Response:', data);
            
            if (data.success && data.authenticated && data.user) {
                console.log('Profile fetched successfully. User data:', data.user);
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
                    window.location.href = './login_account_holder.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Error during profile fetch:', error);
            ErrorHandler.handle(error, 'fetching profile');
            this.disableForm();
        } finally {
            StateManager.setState({ isLoading: false });
            console.log('Profile fetch process finished.');
        }
    },

    updateDisplay() {
        console.log('Updating display...');
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

        console.log('User data for display:', userData);
        
        const fullName = userData.first_name && userData.last_name
            ? `${userData.first_name} ${userData.last_name}`.trim()
            : 'User';
        
        userNameElement.textContent = fullName;
        userAvatarContainer.textContent = fullName.charAt(0).toUpperCase();
        console.log(`Updated display with name: ${fullName} and initial: ${fullName.charAt(0).toUpperCase()}`);
    },

    populateForm() {
        console.log('Populating form...');
        const { userData } = StateManager.state;
        const {
            editFirstNameInput,
            editLastNameInput,
            editUsernameInput,
            editPhoneNumberInput,
            editPasswordInput,
            editConfirmPasswordInput
        } = DOM;

        if (!editFirstNameInput || !editLastNameInput || !editUsernameInput || 
            !editPhoneNumberInput || !userData) {
            console.error('Required form elements or user data missing for population');
            return;
        }

        console.log('User data for form population:', userData);

        editFirstNameInput.value = userData.first_name || '';
        editLastNameInput.value = userData.last_name || '';
        editUsernameInput.value = userData.username || '';
        editPhoneNumberInput.value = userData.phone_number || '';
        
        if (editPasswordInput) editPasswordInput.value = '';
        if (editConfirmPasswordInput) editConfirmPasswordInput.value = '';
        console.log('Form populated.');
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
            DOM.cancelEditButton
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
            editPhoneNumberInput
        } = DOM;

        const updatedProfileData = {
            first_name: editFirstNameInput?.value.trim() || '',
            last_name: editLastNameInput?.value.trim() || '',
            username: editUsernameInput?.value.trim() || '',
            password: editPasswordInput?.value.trim() || null,
            confirm_password: editConfirmPasswordInput?.value.trim() || null,
            phone_number: editPhoneNumberInput?.value.trim() || ''
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

        StateManager.setState({ isLoading: true });
        try {
            const response = await ApiService.updateProfile(updatedProfileData);
            if (response.success) {
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
                    response.error || 'Failed to update profile',
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
        DOM.cancelEditButton.addEventListener('click', this.handleCancel.bind(this));
        
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
    }
};

// Initialize the profile page
document.addEventListener('DOMContentLoaded', () => {
    ProfileManager.init();
}); 
const FORM_VALIDATION = {
    ACCOUNT_NUMBER_MIN_LENGTH: 10,
    SMS_CODE_LENGTH: 6,
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 20,
    FIRST_NAME_MIN_LENGTH: 2,
    LAST_NAME_MIN_LENGTH: 2
};

const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

const STEPS = {
    ENROLLMENT: 1,
    ACCOUNT_CREATION: 2,
    SUCCESS: 3
};

const TIMER_SETTINGS = {
    RESEND_COUNTDOWN: 60,
    NOTIFICATION_AUTO_HIDE: 5000,
    NOTIFICATION_SHOW_DELAY: 100,
    NOTIFICATION_HIDE_DELAY: 300,
    API_SIMULATION_DELAY_SHORT: 1000,
    API_SIMULATION_DELAY_MEDIUM: 1500,
    API_SIMULATION_DELAY_LONG: 2000
};

const INPUT_TYPES = {
    PASSWORD: 'password',
    TEXT: 'text'
};

const BUTTON_STATES = {
    CONTINUE: 'CONTINUE',
    PROCESSING: '<i class="fas fa-spinner fa-spin"></i> Processing...',
    SEND: 'Send',
    SENDING: 'Sending...'
};

class RegistrationManager {
    constructor() {
        this.currentStep = STEPS.ENROLLMENT;
        this.maxStep = STEPS.SUCCESS;
        this.resendTimer = null;
        this.resendCountdown = TIMER_SETTINGS.RESEND_COUNTDOWN;
        this.formData = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.showStep(STEPS.ENROLLMENT);
    }

    bindEvents() {
        // Form submissions
        const enrollmentForm = document.getElementById('enrollment_form');
        const accountForm = document.getElementById('account_form');
        
        if (enrollmentForm) {
            enrollmentForm.addEventListener('submit', (e) => {
                this.handleEnrollmentSubmit(e);
            });
        }

        if (accountForm) {
            accountForm.addEventListener('submit', (e) => {
                this.handleAccountSubmit(e);
            });
        }

        // Navigation buttons
        const backToStepOneBtn = document.getElementById('back_to_step_one');
        if (backToStepOneBtn) {
            backToStepOneBtn.addEventListener('click', () => {
                this.goToStep(STEPS.ENROLLMENT);
            });
        }

        // Send SMS button
        const sendSmsBtn = document.getElementById('send_sms');
        if (sendSmsBtn) {
            sendSmsBtn.addEventListener('click', () => {
                this.sendSmsCode();
            });
        }

        // Resend code link
        const resendCodeLink = document.getElementById('resend_code');
        if (resendCodeLink) {
            resendCodeLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.resendSmsCode();
            });
        }

        // Password toggle buttons
        const passwordToggleBtns = 
            document.querySelectorAll('.password-toggle');
        passwordToggleBtns.forEach(button => {
            button.addEventListener('click', (e) => {
                this.togglePassword(e.target.closest('.password-toggle'));
            });
        });

        // Dashboard button
        const dashboardBtn = document.querySelector('.btn-dashboard');
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => {
                this.goToDashboard();
            });
        }

        // Real-time form validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        // Account number validation
        const accountNumberInput = document.getElementById('account_number');  
        if (accountNumberInput) {
            accountNumberInput.addEventListener('input', (e) => {
                this.validateAccountNumber(e.target);
            });
        }

        // SMS code validation
        const smsCodeInput = document.getElementById('sms_code');
        if (smsCodeInput) {
            smsCodeInput.addEventListener('input', (e) => {
                this.validateSmsCode(e.target);
            });
        }

        // Password validation
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = 
            document.getElementById('confirm_password');
        
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.validatePassword(e.target);
                if (confirmPasswordInput && confirmPasswordInput.value) {
                    this.validatePasswordMatch(passwordInput,
                        confirmPasswordInput);
                }
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                if (passwordInput) {
                    this.validatePasswordMatch(passwordInput,
                        confirmPasswordInput);
                }
            });
        }

        // Username validation
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('input', (e) => {
                this.validateUsername(e.target);
            });
        }
    }

    validateAccountNumber(input) {
        const value = input.value;
        const digitOnlyRegex = /^\d+$/;
        const isValid = digitOnlyRegex.test(value) && 
            value.length >= FORM_VALIDATION.ACCOUNT_NUMBER_MIN_LENGTH;
        
        const errorMsg = `Account number must be at least ` +
            `${FORM_VALIDATION.ACCOUNT_NUMBER_MIN_LENGTH} digits`;
        this.setInputValidation(input, isValid, errorMsg);
        return isValid;
    }

    validateSmsCode(input) {
        const value = input.value;
        const smsCodeRegex = 
            new RegExp(`^\\d{${FORM_VALIDATION.SMS_CODE_LENGTH}}$`);
        const isValid = smsCodeRegex.test(value);
        
        const errorMsg = `SMS code must be ` +
            `${FORM_VALIDATION.SMS_CODE_LENGTH} digits`;
        this.setInputValidation(input, isValid, errorMsg);
        return isValid;
    }

    validatePassword(input) {
        const value = input.value;
        const hasMinLength = 
            value.length >= FORM_VALIDATION.PASSWORD_MIN_LENGTH;
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /\d/.test(value);
        const isValid = hasMinLength && hasUppercase && 
            hasLowercase && hasNumber;
        
        const errorMsg = `Password must be at least ` +
            `${FORM_VALIDATION.PASSWORD_MIN_LENGTH} characters with ` +
            `uppercase, lowercase, and number`;
        this.setInputValidation(input, isValid, errorMsg);
        return isValid;
    }

    validatePasswordMatch(passwordInput, confirmPasswordInput) {
        const passwordValue = passwordInput.value;
        const confirmPasswordValue = confirmPasswordInput.value;
        const isValid = passwordValue === confirmPasswordValue && 
            passwordValue.length > 0;
        
        this.setInputValidation(confirmPasswordInput, isValid, 
            'Passwords do not match');
        return isValid;
    }

    validateUsername(input) {
        const value = input.value;
        const usernameRegex = new RegExp(
            `^[a-zA-Z0-9_]{${FORM_VALIDATION.USERNAME_MIN_LENGTH},` +
            `${FORM_VALIDATION.USERNAME_MAX_LENGTH}}$`);
        const isValid = usernameRegex.test(value);
        
        const errorMsg = `Username must be ` +
            `${FORM_VALIDATION.USERNAME_MIN_LENGTH}-` +
            `${FORM_VALIDATION.USERNAME_MAX_LENGTH} characters ` +
            `(letters, numbers, underscore only)`;
        this.setInputValidation(input, isValid, errorMsg);
        return isValid;
    }

    validateName(input, minLength) {
        const value = input.value.trim();
        const isValid = value.length >= minLength;
        
        const errorMsg = `Name must be at least ${minLength} characters`;
        this.setInputValidation(input, isValid, errorMsg);
        return isValid;
    }

    setInputValidation(input, isValid, errorMessage) {
        const formGroup = input.closest('.form-group');
        
        if (!formGroup) return;
        
        // Remove existing validation classes
        formGroup.classList.remove('error', 'success');
        
        // Remove existing error message
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        if (input.value.length > 0) {
            if (isValid) {
                formGroup.classList.add('success');
            } else {
                formGroup.classList.add('error');
                
                // Add error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = errorMessage;
                formGroup.appendChild(errorDiv);
            }
        }
    }

    handleEnrollmentSubmit(e) {
        e.preventDefault();
        
        const accountNumberInput = document.getElementById('account_number');
        const smsCodeInput = document.getElementById('sms_code');
        
        if (!accountNumberInput || !smsCodeInput) return;
        
        const isAccountValid = this.validateAccountNumber(accountNumberInput);
        const isSmsValid = this.validateSmsCode(smsCodeInput);
        
        if (isAccountValid && isSmsValid) {
            this.showLoadingState('enrollment_form');
            
            // Simulate API call
            setTimeout(() => {
                this.hideLoadingState('enrollment_form');
                this.goToStep(STEPS.ACCOUNT_CREATION);
                this.showNotification('Verification successful!',
                    NOTIFICATION_TYPES.SUCCESS);
            }, TIMER_SETTINGS.API_SIMULATION_DELAY_MEDIUM);
        } else {
            this.showNotification('Please fill in all fields correctly',
                NOTIFICATION_TYPES.ERROR);
        }
    }

    handleAccountSubmit(e) {
        e.preventDefault();
        
        const firstNameInput = document.getElementById('first_name');
        const lastNameInput = document.getElementById('last_name');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = 
            document.getElementById('confirm_password');
        
        if (!firstNameInput || !lastNameInput || !usernameInput || 
            !passwordInput || !confirmPasswordInput) return;
        
        // Validate all fields
        const isFirstNameValid = this.validateName(firstNameInput,
            FORM_VALIDATION.FIRST_NAME_MIN_LENGTH);
        const isLastNameValid = this.validateName(lastNameInput,
            FORM_VALIDATION.LAST_NAME_MIN_LENGTH);
        const isUsernameValid = this.validateUsername(usernameInput);
        const isPasswordValid = this.validatePassword(passwordInput);
        const isPasswordMatchValid = this.validatePasswordMatch(
            passwordInput, confirmPasswordInput);
        
        const allFieldsValid = isFirstNameValid && isLastNameValid &&
            isUsernameValid && isPasswordValid && isPasswordMatchValid;
        
        if (allFieldsValid) {
            this.showLoadingState('account_form');
            
            // Update account holder name in success page
            const fullName = `${firstNameInput.value.trim()} ` +
                `${lastNameInput.value.trim()}`;
            const accountHolderElement = 
                document.getElementById('account_holder_name');
            if (accountHolderElement) {
                accountHolderElement.textContent = fullName;
            }
            
            // Generate and set member ID
            const memberId = this.generateMemberId(
                firstNameInput.value.trim(),
                lastNameInput.value.trim());
            const memberIdElement = document.getElementById('member_id');
            if (memberIdElement) {
                memberIdElement.textContent = memberId;
            }
            
            // Simulate API call
            setTimeout(() => {
                this.hideLoadingState('account_form');
                this.goToStep(STEPS.SUCCESS);
                this.showNotification('Account created successfully!',
                    NOTIFICATION_TYPES.SUCCESS);
            }, TIMER_SETTINGS.API_SIMULATION_DELAY_LONG);
        } else {
            this.showNotification('Please fill in all fields correctly',
                NOTIFICATION_TYPES.ERROR);
        }
    }

    goToStep(step) {
        const isValidStep = step >= STEPS.ENROLLMENT && step <= this.maxStep;
        if (!isValidStep) return;
        
        this.currentStep = step;
        this.showStep(step);
        this.updateStepIndicators();
    }

    showStep(step) {
        // Hide all steps
        const allSteps = document.querySelectorAll('.form-step');
        allSteps.forEach(stepEl => {
            stepEl.classList.remove('active');
        });
        
        // Show current step
        const currentStepElement = 
            document.getElementById(`step_${this.getStepName(step)}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
    }

    getStepName(step) {
        switch (step) {
            case STEPS.ENROLLMENT:
                return 'one';
            case STEPS.ACCOUNT_CREATION:
                return 'two';
            case STEPS.SUCCESS:
                return 'three';
            default:
                return 'one';
        }
    }

    updateStepIndicators() {
        const stepIndicators = 
            document.querySelectorAll('.step-indicators .step');
        stepIndicators.forEach(indicator => {
            const stepNumber = parseInt(indicator.dataset.step);
            indicator.classList.toggle('active',
                stepNumber === this.currentStep);
        });
    }

    sendSmsCode() {
        const accountNumberInput = document.getElementById('account_number');
        const sendBtn = document.getElementById('send_sms');
        
        if (!accountNumberInput || !sendBtn) return;
        
        if (!this.validateAccountNumber(accountNumberInput)) {
            this.showNotification(
                'Please enter a valid account number first',
                NOTIFICATION_TYPES.ERROR);
            return;
        }
        
        // Show loading state
        sendBtn.innerHTML = BUTTON_STATES.SENDING;
        sendBtn.disabled = true;
        
        // Simulate SMS sending
        setTimeout(() => {
            sendBtn.innerHTML = BUTTON_STATES.SEND;
            sendBtn.disabled = false;
            this.showNotification('SMS code sent successfully!',
                NOTIFICATION_TYPES.SUCCESS);
            this.startResendTimer();
        }, TIMER_SETTINGS.API_SIMULATION_DELAY_SHORT);
    }

    resendSmsCode() {
        if (this.resendTimer) return; // Timer is still running
        
        this.sendSmsCode();
        this.showNotification('SMS code resent!', NOTIFICATION_TYPES.INFO);
    }

    startResendTimer() {
        const resendLink = document.getElementById('resend_code');
        if (!resendLink) return;
        
        this.resendCountdown = TIMER_SETTINGS.RESEND_COUNTDOWN;
        resendLink.style.pointerEvents = 'none';
        resendLink.style.opacity = '0.5';
        
        this.resendTimer = setInterval(() => {
            this.resendCountdown--;
            resendLink.textContent = 
                `Resend the code in ${this.resendCountdown}s`;
            
            if (this.resendCountdown <= 0) {
                clearInterval(this.resendTimer);
                this.resendTimer = null;
                resendLink.textContent = 'Resend the code';
                resendLink.style.pointerEvents = 'auto';
                resendLink.style.opacity = '1';
            }
        }, 1000);
    }

    togglePassword(button) {
        if (!button) return;
        
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        const icon = button.querySelector('i');
        
        if (!input || !icon) return;
        
        const isPassword = input.type === INPUT_TYPES.PASSWORD;
        
        input.type = isPassword ? INPUT_TYPES.TEXT : INPUT_TYPES.PASSWORD;
        icon.className = isPassword ? 'fas fa-eye' : 'fas fa-eye-slash';
    }

    showLoadingState(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = BUTTON_STATES.PROCESSING;
            submitBtn.disabled = true;
        }
        
        // Disable all form inputs
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            if (input.type !== 'submit') {
                input.disabled = true;
            }
        });
    }

    hideLoadingState(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = BUTTON_STATES.CONTINUE;
            submitBtn.disabled = false;
        }
        
        // Re-enable all form inputs
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = false;
        });
    }

    generateMemberId(firstName, lastName) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        
        const initials = 
            (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        const lastNameUpper = lastName.toUpperCase().substring(0, 3);
        
        return `${lastNameUpper}${year}${month}${day}`;
    }

    showNotification(message, type = NOTIFICATION_TYPES.INFO) {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, TIMER_SETTINGS.NOTIFICATION_SHOW_DELAY);
        
        // Auto-hide notification
        setTimeout(() => {
            this.hideNotification(notification);
        }, TIMER_SETTINGS.NOTIFICATION_AUTO_HIDE);
        
        // Close button event
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideNotification(notification);
            });
        }
    }

    getNotificationIcon(type) {
        switch (type) {
            case NOTIFICATION_TYPES.SUCCESS:
                return 'fa-check-circle';
            case NOTIFICATION_TYPES.ERROR:
                return 'fa-exclamation-circle';
            case NOTIFICATION_TYPES.WARNING:
                return 'fa-exclamation-triangle';
            case NOTIFICATION_TYPES.INFO:
            default:
                return 'fa-info-circle';
        }
    }

    hideNotification(notification) {
        if (!notification) return;
        
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, TIMER_SETTINGS.NOTIFICATION_HIDE_DELAY);
    }

    goToDashboard() {
        this.showNotification('Redirecting to dashboard...',
            NOTIFICATION_TYPES.INFO);
        
        // Simulate redirect
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RegistrationManager();
});
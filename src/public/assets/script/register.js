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
    VERIFICATION: 2,
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
        const detailsForm = document.getElementById('details_form');
        const otpForm = document.getElementById('otp_form');
        
        if (detailsForm) {
            detailsForm.addEventListener('submit', (e) => {
                this.handleDetailsSubmit(e);
            });
        }

        if (otpForm) {
            otpForm.addEventListener('submit', (e) => {
                this.handleOtpSubmit(e);
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

        // Login button on success page
        const loginNowBtn = document.getElementById('login_now_btn');
        if (loginNowBtn) {
            loginNowBtn.addEventListener('click', () => {
                this.showNotification('Redirecting to login page...', NOTIFICATION_TYPES.INFO);
                console.log('Simulating redirect to login page.');
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
        console.log('validatePassword called.');
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
        console.log('validatePassword result:', isValid);
        return isValid;
    }

    validatePasswordMatch(passwordInput, confirmPasswordInput) {
        console.log('validatePasswordMatch called.');
        const passwordValue = passwordInput.value;
        const confirmPasswordValue = confirmPasswordInput.value;
        const isValid = passwordValue === confirmPasswordValue && 
            passwordValue.length > 0;
        
        this.setInputValidation(confirmPasswordInput, isValid, 
            'Passwords do not match');
        console.log('validatePasswordMatch result:', isValid);
        return isValid;
    }

    validateUsername(input) {
        console.log('validateUsername called.');
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
        console.log('validateUsername result:', isValid);
        return isValid;
    }

    validateName(input, minLength) {
        console.log('validateName called.');
        const value = input.value.trim();
        const isValid = value.length >= minLength;
        
        const errorMsg = `Name must be at least ${minLength} characters`;
        this.setInputValidation(input, isValid, errorMsg);
        console.log('validateName result:', isValid);
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

    handleDetailsSubmit(e) {
        console.log('handleDetailsSubmit triggered.');
        e.preventDefault();
        
        const firstNameInput = document.getElementById('first_name');
        const lastNameInput = document.getElementById('last_name');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = 
            document.getElementById('confirm_password');
        const phoneNumberInput = document.getElementById('phone_number');
        
        if (!firstNameInput || !lastNameInput || !usernameInput || 
            !passwordInput || !confirmPasswordInput || !phoneNumberInput) {
            console.error('One or more input elements not found in Details form.');
            this.showNotification('An internal error occurred.', NOTIFICATION_TYPES.ERROR);
            return;
        }
        
        // Validate all fields
        const isFirstNameValid = this.validateName(firstNameInput,
            FORM_VALIDATION.FIRST_NAME_MIN_LENGTH);
        console.log('isFirstNameValid:', isFirstNameValid);
        const isLastNameValid = this.validateName(lastNameInput,
            FORM_VALIDATION.LAST_NAME_MIN_LENGTH);
        console.log('isLastNameValid:', isLastNameValid);
        const isUsernameValid = this.validateUsername(usernameInput);
        console.log('isUsernameValid:', isUsernameValid);
        const isPasswordValid = this.validatePassword(passwordInput);
        console.log('isPasswordValid:', isPasswordValid);
        const isPasswordMatchValid = this.validatePasswordMatch(
            passwordInput, confirmPasswordInput);
        console.log('isPasswordMatchValid:', isPasswordMatchValid);
        const isPhoneNumberValid = this.validatePhoneNumber(phoneNumberInput);
        console.log('isPhoneNumberValid:', isPhoneNumberValid);
        
        const allFieldsValid = isFirstNameValid && isLastNameValid &&
            isUsernameValid && isPasswordValid && isPasswordMatchValid && isPhoneNumberValid;
        
        console.log('allFieldsValid:', allFieldsValid);
        
        if (allFieldsValid) {
            console.log('All fields are valid. Proceeding.');
            this.showLoadingState('details_form');
            
            // Store form data (optional, but good for later steps)
            this.formData = {
                firstName: firstNameInput.value.trim(),
                lastName: lastNameInput.value.trim(),
                username: usernameInput.value.trim(),
                password: passwordInput.value, // Keep password for potential re-submission, though ideally not stored long-term
                phoneNumber: phoneNumberInput.value.trim()
            };
            
            // Simulate sending OTP and going to the next step
            setTimeout(() => {
                console.log('Simulated API call complete. Hiding loading state and going to next step.');
                this.hideLoadingState('details_form');
                this.goToStep(STEPS.VERIFICATION); // Move to the OTP verification step
                this.showNotification('Details saved. Please verify your phone number.', NOTIFICATION_TYPES.SUCCESS);
                this.startOtpTimer(); // Start the OTP resend timer
            }, TIMER_SETTINGS.API_SIMULATION_DELAY_MEDIUM);
        } else {
            console.log('Validation failed. Showing error notification.');
            this.showNotification('Please fill in all fields correctly.', NOTIFICATION_TYPES.ERROR);
        }
    }

    handleOtpSubmit(e) {
        e.preventDefault();
        
        const otpCodeInput = document.getElementById('otp_code');
        if (!otpCodeInput) {
            console.error('OTP input element not found.');
            this.showNotification('An internal error occurred.', NOTIFICATION_TYPES.ERROR);
            return;
        }
        
        const otpCode = otpCodeInput.value.trim();
        // Basic OTP validation (e.g., check length)
        const isOtpValid = otpCode.length === FORM_VALIDATION.SMS_CODE_LENGTH; // Reusing SMS_CODE_LENGTH for OTP
        
        if (isOtpValid) {
            this.showLoadingState('otp_form');
            
            // Simulate OTP verification API call
            setTimeout(() => {
                this.hideLoadingState('otp_form');
                
                // Simulate successful verification
                const isVerificationSuccessful = true; // Replace with actual verification logic
                
                if (isVerificationSuccessful) {
                    this.goToStep(STEPS.SUCCESS);
                    this.showNotification('Phone number verified successfully!', NOTIFICATION_TYPES.SUCCESS);
                    this.populateSuccessPage(); // Populate the success page with generated info
                } else {
                    this.showNotification('Invalid OTP. Please try again.', NOTIFICATION_TYPES.ERROR);
                }
            }, TIMER_SETTINGS.API_SIMULATION_DELAY_MEDIUM);
        } else {
            this.showNotification(`Please enter a valid ${FORM_VALIDATION.SMS_CODE_LENGTH}-digit OTP.`, NOTIFICATION_TYPES.ERROR);
        }
    }

    goToStep(step) {
        console.log('goToStep called with step:', step);
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
            case STEPS.VERIFICATION:
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

    generateAccountNumber() {
        // Simple timestamp-based account number
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `SAC${timestamp}${random}`.substring(0, 12); // Example format, adjust as needed
    }

    populateSuccessPage() {
        const usernameElement = document.getElementById('registered_username');
        const accountNumberElement = document.getElementById('generated_account_number');
        
        if (usernameElement && accountNumberElement) {
            // Use data from the details form (assuming it's stored in this.formData)
            usernameElement.textContent = this.formData.username || 'N/A'; // Display the username entered in step 1
            const newAccountNumber = this.generateAccountNumber(); // Generate a new account number
            accountNumberElement.textContent = newAccountNumber;
        } else {
            console.error('Success page elements not found.');
        }
    }

    startOtpTimer() {
        const resendLink = document.getElementById('resend_otp');
        if (!resendLink) return;
        
        this.resendCountdown = TIMER_SETTINGS.RESEND_COUNTDOWN;
        resendLink.style.pointerEvents = 'none';
        resendLink.style.opacity = '0.5';
        
        resendLink.textContent = `Resend OTP in ${this.resendCountdown}s`;
        
        this.resendTimer = setInterval(() => {
            this.resendCountdown--;
            resendLink.textContent = `Resend OTP in ${this.resendCountdown}s`;
            
            if (this.resendCountdown <= 0) {
                clearInterval(this.resendTimer);
                this.resendTimer = null;
                resendLink.textContent = 'Resend OTP';
                resendLink.style.pointerEvents = 'auto';
                resendLink.style.opacity = '1';
            }
        }, 1000);
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

    validatePhoneNumber(input) {
        console.log('validatePhoneNumber called.');
        const value = input.value.trim();
        // Basic validation: starts with +, contains only digits and spaces/hyphens
        // In a real app, use a more robust regex based on expected formats
        const phoneRegex = /^\+?\d[\d\s-]{7,}/;
        const isValid = phoneRegex.test(value);
        
        const errorMsg = 'Please enter a valid phone number (e.g., +1 555 123 4567)';
        this.setInputValidation(input, isValid, errorMsg);
        console.log('validatePhoneNumber result:', isValid);
        return isValid;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RegistrationManager();
});
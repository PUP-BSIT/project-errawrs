// API Endpoints
const API = {
    CONTACT_SUBMIT: '../../src/api/public/contact_mailer.php',
};

// Element IDs
const ELEMENT_ID = {
    CONTACT_FORM: 'contact_form',
    FULL_NAME: 'full_name',
    EMAIL_ADDRESS: 'email_address',
    MESSAGE_SUBJECT: 'message_subject',
    MESSAGE_CONTENT: 'message_content',
};

// CSS Classes
const CLASS = {
    FORM_INPUT: 'form-input',
    FORM_GROUP: 'form-group',
    ERROR_MESSAGE: 'error-message',
    ERROR: 'error',
    SUCCESS: 'success',
    SUBMIT_BUTTON: 'submit-button',
    NOTIFICATION: 'notification',
    NOTIFICATION_CONTENT: 'notification-content',
    NOTIFICATION_CLOSE: 'notification-close',
    SHOW: 'show',
    ANIMATE_IN: 'animate-in',
};

// Alert Types
const ALERT_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

// Alert Icons
const ICON = {
    SUCCESS: 'fa-check-circle',
    ERROR: 'fa-exclamation-circle',
    WARNING: 'fa-exclamation-triangle',
    INFO: 'fa-info-circle',
    SPINNER: 'fa-spinner fa-spin',
    PAPER_PLANE: 'fa-paper-plane',
    TIMES: 'fa-times',
};

// Text Content
const TEXT = {
    FORM_VALIDATION_ERROR: 'Please fill in all fields correctly',
    MESSAGE_SENT: 'Message sent successfully!',
    SEND_FAILURE: 'Failed to send message. Please try again.',
    SENDING: 'Sending...',
    SEND_MESSAGE: 'Send Message',
    NAME_ERROR: 'Name must be at least 2 characters long',
    EMAIL_ERROR: 'Please enter a valid email address',
    SUBJECT_ERROR: 'Subject must be at least 3 characters long',
    MESSAGE_ERROR: 'Message must be at least 10 characters long',
};

// Timing (in milliseconds)
const TIMING = {
    NOTIFICATION_SHOW_DELAY: 100,
    NOTIFICATION_HIDE_DELAY: 300,
    NOTIFICATION_AUTO_HIDE: 5000,
    FORM_SUBMIT_SIMULATION: 1500,
};

// Observer Configuration
const OBSERVER_CONFIG = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
};

// Form Handler
class ContactFormHandler {
    constructor() {
        this.form = document.getElementById(ELEMENT_ID.CONTACT_FORM);
        this.submitButton = document.querySelector(`.${CLASS.SUBMIT_BUTTON}`);
        this.initialize();
    }

    initialize() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            this.setupInputValidation();
        }
    }

    setupInputValidation() {
        const inputs = this.form.querySelectorAll(`.${CLASS.FORM_INPUT}`);
        inputs.forEach((input) => {
            input.addEventListener('input', () => this.validateInput(input));
            input.addEventListener('blur', () => this.validateInput(input));
        });
    }

    validateInput(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (input.id) {
            case ELEMENT_ID.FULL_NAME:
                isValid = value.length >= 2;
                errorMessage = TEXT.NAME_ERROR;
                break;
            case ELEMENT_ID.EMAIL_ADDRESS:
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                errorMessage = TEXT.EMAIL_ERROR;
                break;
            case ELEMENT_ID.MESSAGE_SUBJECT:
                isValid = value.length >= 3;
                errorMessage = TEXT.SUBJECT_ERROR;
                break;
            case ELEMENT_ID.MESSAGE_CONTENT:
                isValid = value.length >= 10;
                errorMessage = TEXT.MESSAGE_ERROR;
                break;
        }

        this.setInputValidationState(input, isValid, errorMessage);
        return isValid;
    }

    setInputValidationState(input, isValid, errorMessage) {
        const formGroup = input.closest(`.${CLASS.FORM_GROUP}`);
        const existingError = formGroup.querySelector(
            `.${CLASS.ERROR_MESSAGE}`
        );

        if (existingError) {
            existingError.remove();
        }

        if (!isValid && input.value.length > 0) {
            const errorElement = document.createElement('div');
            errorElement.className = CLASS.ERROR_MESSAGE;
            errorElement.textContent = errorMessage;
            formGroup.appendChild(errorElement);
            input.classList.add(CLASS.ERROR);
            input.classList.remove(CLASS.SUCCESS);
        } else if (input.value.length > 0) {
            input.classList.add(CLASS.SUCCESS);
            input.classList.remove(CLASS.ERROR);
        } else {
            input.classList.remove(CLASS.SUCCESS, CLASS.ERROR);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const inputs = this.form.querySelectorAll(`.${CLASS.FORM_INPUT}`);
        let isFormValid = true;

        inputs.forEach((input) => {
            if (!this.validateInput(input)) {
                isFormValid = false;
            }
        });

        if (!isFormValid) {
            this.showNotification(
                TEXT.FORM_VALIDATION_ERROR,
                ALERT_TYPES.WARNING
            );
            return;
        }

        this.setLoadingState(true);

        try {
            const formData = new FormData();
            formData.append(
                'name',
                this.form.querySelector(`#${ELEMENT_ID.FULL_NAME}`).value
            );
            formData.append(
                'email',
                this.form.querySelector(`#${ELEMENT_ID.EMAIL_ADDRESS}`).value
            );
            formData.append(
                'subject',
                this.form.querySelector(`#${ELEMENT_ID.MESSAGE_SUBJECT}`).value
            );
            formData.append(
                'message',
                this.form.querySelector(`#${ELEMENT_ID.MESSAGE_CONTENT}`).value
            );

            const response = await fetch(API.CONTACT_SUBMIT, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showNotification(TEXT.MESSAGE_SENT, ALERT_TYPES.SUCCESS);
                this.form.reset();
                // Remove success classes after form reset
                inputs.forEach((input) => {
                    input.classList.remove(CLASS.SUCCESS);
                });
            } else {
                this.showNotification(
                    result.message || TEXT.SEND_FAILURE,
                    ALERT_TYPES.ERROR
                );
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification(TEXT.SEND_FAILURE, ALERT_TYPES.ERROR);
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        if (this.submitButton) {
            this.submitButton.disabled = isLoading;
            this.submitButton.innerHTML = isLoading
                ? `<i class="fas ${ICON.SPINNER}"></i> ${TEXT.SENDING}`
                : `${TEXT.SEND_MESSAGE} <i class="fas ${ICON.PAPER_PLANE}"></i>`;
        }
    }

    showNotification(message, type = ALERT_TYPES.INFO) {
        // Remove existing notification
        const existingNotification = document.querySelector(
            `.${CLASS.NOTIFICATION}`
        );
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `${CLASS.NOTIFICATION} ${CLASS.NOTIFICATION}-${type}`;
        notification.innerHTML = `
            <div class="${CLASS.NOTIFICATION_CONTENT}">
                <i class="fas ${ICON[type]}"></i>
                <span>${message}</span>
                <button class="${CLASS.NOTIFICATION_CLOSE}">
                    <i class="fas ${ICON.TIMES}"></i>
                </button>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Show with animation
        setTimeout(() => {
            notification.classList.add(CLASS.SHOW);
        }, TIMING.NOTIFICATION_SHOW_DELAY);

        // Setup close button
        const closeBtn = notification.querySelector(
            `.${CLASS.NOTIFICATION_CLOSE}`
        );
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.remove(CLASS.SHOW);
                setTimeout(
                    () => notification.remove(),
                    TIMING.NOTIFICATION_HIDE_DELAY
                );
            });
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove(CLASS.SHOW);
                setTimeout(
                    () => notification.remove(),
                    TIMING.NOTIFICATION_HIDE_DELAY
                );
            }
        }, TIMING.NOTIFICATION_AUTO_HIDE);
    }
}

// Smooth Scroll Navigation
class SmoothScrollNavigation {
    constructor() {
        this.links = document.querySelectorAll('a[href^="#"]');
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.links.forEach((link) => {
            link.addEventListener('click', (e) => this.handleClick(e));
        });
    }

    handleClick(e) {
        e.preventDefault();

        const targetId = e.currentTarget.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    }
}

// Scroll Animation Controller
class ScrollAnimationController {
    constructor() {
        this.animatedElements = document.querySelectorAll(
            '.contact-form-wrapper, .contact-info-section'
        );
        this.initialize();
    }

    initialize() {
        this.setupIntersectionObserver();
    }

    setupIntersectionObserver() {
        if (typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver((entries) => {
                this.handleIntersectionChanges(entries);
            }, OBSERVER_CONFIG);

            this.observeElements(observer);
        }
    }

    handleIntersectionChanges(entries) {
        entries.forEach((entry) => {
            if (entry.isIntersecting === true) {
                entry.target.classList.add('animate-in');
            }
        });
    }

    observeElements(observer) {
        this.animatedElements.forEach((element) => {
            observer.observe(element);
        });
    }
}

// Application Initializer
class ApplicationInitializer {
    constructor() {
        this.initialize();
    }

    initialize() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeComponents();
            this.logSuccessMessage();
        });
    }

    initializeComponents() {
        new ContactFormHandler();
        new SmoothScrollNavigation();
        new ScrollAnimationController();
    }

    logSuccessMessage() {
        console.log('Contact page initialized successfully!');
    }
}

// Initialize Application
new ApplicationInitializer();
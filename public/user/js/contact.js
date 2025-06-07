// Constants
const ALERT_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

const ALERT_ICONS = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
};

const OBSERVER_CONFIG = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
};

// Form Handler
class ContactFormHandler {
    constructor() {
        this.form = document.getElementById('contact_form');
        this.submitButton = document.querySelector('.submit-button');
        this.initialize();
    }

    initialize() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            this.setupInputValidation();
        }
    }

    setupInputValidation() {
        const inputs = this.form.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateInput(input));
            input.addEventListener('blur', () => this.validateInput(input));
        });
    }

    validateInput(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (input.id) {
            case 'full_name':
                isValid = value.length >= 2;
                errorMessage = 'Name must be at least 2 characters long';
                break;
            case 'email_address':
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                errorMessage = 'Please enter a valid email address';
                break;
            case 'message_subject':
                isValid = value.length >= 3;
                errorMessage = 'Subject must be at least 3 characters long';
                break;
            case 'message_content':
                isValid = value.length >= 10;
                errorMessage = 'Message must be at least 10 characters long';
                break;
        }

        this.setInputValidationState(input, isValid, errorMessage);
        return isValid;
    }

    setInputValidationState(input, isValid, errorMessage) {
        const formGroup = input.closest('.form-group');
        const existingError = formGroup.querySelector('.error-message');

        if (existingError) {
            existingError.remove();
        }

        if (!isValid && input.value.length > 0) {
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = errorMessage;
            formGroup.appendChild(errorElement);
            input.classList.add('error');
            input.classList.remove('success');
        } else if (input.value.length > 0) {
            input.classList.add('success');
            input.classList.remove('error');
        } else {
            input.classList.remove('success', 'error');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const inputs = this.form.querySelectorAll('.form-input');
        let isFormValid = true;

        inputs.forEach(input => {
            if (!this.validateInput(input)) {
                isFormValid = false;
            }
        });

        if (!isFormValid) {
            this.showNotification('Please fill in all fields correctly', ALERT_TYPES.WARNING);
            return;
        }

        this.setLoadingState(true);

        try {
            const formData = {
                name: this.form.querySelector('#full_name').value,
                email: this.form.querySelector('#email_address').value,
                subject: this.form.querySelector('#message_subject').value,
                message: this.form.querySelector('#message_content').value
            };

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate successful submission
            this.showNotification('Message sent successfully!', ALERT_TYPES.SUCCESS);
            this.form.reset();
            
            // Remove success classes after form reset
            inputs.forEach(input => {
                input.classList.remove('success');
            });

        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification('Failed to send message. Please try again.', ALERT_TYPES.ERROR);
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        if (this.submitButton) {
            this.submitButton.disabled = isLoading;
            this.submitButton.innerHTML = isLoading
                ? '<i class="fas fa-spinner fa-spin"></i> Sending...'
                : 'Send Message <i class="fas fa-paper-plane"></i>';
        }
    }

    showNotification(message, type = ALERT_TYPES.INFO) {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${ALERT_ICONS[type]}"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Show with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Setup close button
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            });
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
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

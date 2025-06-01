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
    threshold: 0.1
};

// Form Handler
class ContactFormHandler {
    constructor() {
        this.form = document.getElementById('contact_form');
        this.submitButton = document.querySelector('button[type="submit"]');
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        this.setLoadingState(true);

        try {
            const formData = this.getFormData();
            const response = await this.submitForm(formData);
            
            if (response.success) {
                this.showNotification('Message sent successfully!', ALERT_TYPES.SUCCESS);
                this.resetForm();
            } else {
                throw new Error(response.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification(
                'Failed to send message. Please try again.',
                ALERT_TYPES.ERROR
            );
        } finally {
            this.setLoadingState(false);
        }
    }

    validateForm() {
        const name = this.form.querySelector('#name').value.trim();
        const email = this.form.querySelector('#email').value.trim();
        const message = this.form.querySelector('#message').value.trim();

        if (!name) {
            this.showNotification('Please enter your name', ALERT_TYPES.WARNING);
            return false;
        }

        if (!email) {
            this.showNotification('Please enter your email', ALERT_TYPES.WARNING);
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showNotification('Please enter a valid email address', ALERT_TYPES.WARNING);
            return false;
        }

        if (!message) {
            this.showNotification('Please enter your message', ALERT_TYPES.WARNING);
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getFormData() {
        const formData = new FormData(this.form);
        return Object.fromEntries(formData.entries());
    }

    async submitForm(data) {
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    setLoadingState(isLoading) {
        if (this.submitButton) {
            this.submitButton.disabled = isLoading;
            this.submitButton.innerHTML = isLoading
                ? '<i class="fas fa-spinner fa-spin"></i> Sending...'
                : 'Send Message';
        }
    }

    resetForm() {
        if (this.form) {
            this.form.reset();
        }
    }

    showNotification(message, type = ALERT_TYPES.INFO) {
        const notification = document.createElement('div');
        notification.className = `notification-alert alert-${type}`;
        
        notification.innerHTML = `
            <i class="fas ${this.getAlertIconClass(type)}"></i>
            <span>${message}</span>
            <button class="alert-close-button">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        const closeButton = notification.querySelector('.alert-close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.remove();
            });
        }

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    getAlertIconClass(type) {
        return ALERT_ICONS[type] || ALERT_ICONS.info;
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
        this.links.forEach(link => {
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
                block: 'start'
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
        entries.forEach(entry => {
            if (entry.isIntersecting === true) {
                entry.target.classList.add('animate-in');
            }
        });
    }

    observeElements(observer) {
        this.animatedElements.forEach(element => {
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
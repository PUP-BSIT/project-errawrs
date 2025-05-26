// Constants
const VALIDATION_RULES = {
    minNameLength: 2,
    minSubjectLength: 3,
    minMessageLength: 10,
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

const ALERT_TYPES = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
};

const ALERT_ICONS = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
};

const BUTTON_STATES = {
    default: 'Send Message',
    loading: 'Sending...'
};

const ANIMATION_DELAYS = {
    formSubmission: 2000,
    alertAutoRemove: 5000
};

const OBSERVER_CONFIG = {
    threshold: 0.1
};

// Contact Form Handler
class ContactFormHandler {
    constructor() {
        this.form = document.getElementById('contact_form');
        this.submitButton = document.getElementById('submit_button');
        this.inputs = document.querySelectorAll('.form-input-field');
        
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (event) => {
                this.handleFormSubmission(event);
            });
        }
        
        this.inputs.forEach(input => {
            input.addEventListener('focus', (event) => {
                this.handleInputFocus(event);
            });
            input.addEventListener('blur', (event) => {
                this.handleInputBlur(event);
            });
        });
    }

    handleFormSubmission(event) {
        event.preventDefault();
        
        const formData = this.extractFormData();
        
        if (this.validateFormData(formData) === true) {
            this.processFormSubmission(formData);
        }
    }

    extractFormData() {
        const fullNameElement = document.getElementById('full_name');
        const emailElement = document.getElementById('email_address');
        const subjectElement = document.getElementById('message_subject');
        const messageElement = document.getElementById('message_content');

        return {
            name: fullNameElement ? fullNameElement.value.trim() : '',
            email: emailElement ? emailElement.value.trim() : '',
            subject: subjectElement ? subjectElement.value.trim() : '',
            message: messageElement ? messageElement.value.trim() : ''
        };
    }

    validateFormData(data) {
        if (this.isAnyFieldEmpty(data) === true) {
            this.displayAlert('Please fill in all fields', ALERT_TYPES.error);
            return false;
        }

        if (this.isValidEmail(data.email) === false) {
            this.displayAlert(
                'Please enter a valid email address', 
                ALERT_TYPES.error
            );
            return false;
        }

        if (data.name.length < VALIDATION_RULES.minNameLength) {
            this.displayAlert('Please enter a valid name', ALERT_TYPES.error);
            return false;
        }

        if (data.subject.length < VALIDATION_RULES.minSubjectLength) {
            this.displayAlert(
                'Subject must be at least 3 characters long', 
                ALERT_TYPES.error
            );
            return false;
        }

        if (data.message.length < VALIDATION_RULES.minMessageLength) {
            this.displayAlert(
                'Message must be at least 10 characters long', 
                ALERT_TYPES.error
            );
            return false;
        }

        return true;
    }

    isAnyFieldEmpty(data) {
        return (
            data.name === '' || 
            data.email === '' || 
            data.subject === '' || 
            data.message === ''
        );
    }

    isValidEmail(email) {
        return VALIDATION_RULES.emailPattern.test(email);
    }

    processFormSubmission(data) {
        this.setButtonLoadingState(true);
        
        setTimeout(() => {
            console.log('Form submitted:', data);
            
            this.displayAlert(
                'Message sent successfully! We\'ll get back to you soon.', 
                ALERT_TYPES.success
            );
            
            this.resetForm();
            this.setButtonLoadingState(false);
            
        }, ANIMATION_DELAYS.formSubmission);
    }

    setButtonLoadingState(isLoading) {
        if (this.submitButton) {
            if (isLoading === true) {
                this.submitButton.textContent = BUTTON_STATES.loading;
                this.submitButton.disabled = true;
                this.submitButton.style.opacity = '0.7';
            } else {
                this.submitButton.textContent = BUTTON_STATES.default;
                this.submitButton.disabled = false;
                this.submitButton.style.opacity = '1';
            }
        }
    }

    resetForm() {
        if (this.form) {
            this.form.reset();
        }
    }

    handleInputFocus(event) {
        event.target.style.transform = 'scale(1.02)';
        event.target.style.transition = 'transform 0.2s ease';
    }

    handleInputBlur(event) {
        event.target.style.transform = 'scale(1)';
    }

    displayAlert(message, type = ALERT_TYPES.info) {
        this.removeExistingAlert();

        const alertElement = this.createAlertElement(message, type);
        
        if (this.form) {
            this.form.insertBefore(alertElement, this.form.firstChild);
        }

        this.scheduleAlertRemoval(alertElement);
    }

    removeExistingAlert() {
        const existingAlert = document.querySelector('.notification-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
    }

    createAlertElement(message, type) {
        const alertElement = document.createElement('div');
        alertElement.className = `notification-alert alert-${type}`;
        alertElement.innerHTML = `
            <i class="fas ${this.getAlertIconClass(type)}"></i>
            <span>${message}</span>
            <button class="alert-close-button" 
                    onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        return alertElement;
    }

    getAlertIconClass(type) {
        return ALERT_ICONS[type] || ALERT_ICONS.info;
    }

    scheduleAlertRemoval(alertElement) {
        setTimeout(() => {
            if (alertElement.parentElement) {
                alertElement.remove();
            }
        }, ANIMATION_DELAYS.alertAutoRemove);
    }
}

// Smooth Scroll Navigation
class SmoothScrollNavigation {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.setupScrollListeners();
    }

    setupScrollListeners() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        anchorLinks.forEach(anchor => {
            anchor.addEventListener('click', (event) => {
                this.handleAnchorClick(event, anchor);
            });
        });
    }

    handleAnchorClick(event, anchor) {
        event.preventDefault();
        
        const targetSelector = anchor.getAttribute('href');
        const targetElement = document.querySelector(targetSelector);
        
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
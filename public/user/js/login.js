// API Endpoints
const API_LOGIN = '../../src/api/auth/login.php';

// Routes
const ROUTE_DASHBOARD = './user_dashboard.html';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Element IDs and Selectors
    const ELEMENT_ID = {
        LOGIN_FORM: 'login_form'
    };
    
    const SELECTOR = {
        PASSWORD_TOGGLE: '.password-toggle'
    };

    const loginForm = document.getElementById(ELEMENT_ID.LOGIN_FORM);
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Password toggle functionality
    const passwordToggle = document.querySelector(SELECTOR.PASSWORD_TOGGLE);
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () =>
            togglePasswordVisibility(passwordToggle)
        );
    }
});

async function handleLogin(e) {
    e.preventDefault();

    // Element IDs and Selectors
    const ELEMENT_ID = {
        USERNAME: 'username',
        PASSWORD: 'password'
    };
    
    const SELECTOR = {
        SUBMIT_BUTTON: 'button[type="submit"]'
    };
    
    // Notification Types
    const NOTIFICATION_TYPE = {
        SUCCESS: 'success',
        ERROR: 'error'
    };
    
    // Text Content
    const TEXT = {
        ELEMENTS_NOT_FOUND: 'Form elements not found',
        FIELDS_REQUIRED: 'Please fill in all fields',
        LOGIN_SUCCESS: 'Login successful! Redirecting...',
        LOGIN_ERROR: 'Login failed',
        GENERIC_ERROR: 'An error occurred. Please try again.'
    };
    
    // Timing (in milliseconds)
    const TIMING = {
        REDIRECT_DELAY: 1500
    };

    const usernameInput = document.getElementById(ELEMENT_ID.USERNAME);
    const passwordInput = document.getElementById(ELEMENT_ID.PASSWORD);
    const submitBtn = document.querySelector(SELECTOR.SUBMIT_BUTTON);

    if (!usernameInput || !passwordInput || !submitBtn) {
        showNotification(TEXT.ELEMENTS_NOT_FOUND, NOTIFICATION_TYPE.ERROR);
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Basic validation
    if (!username || !password) {
        showNotification(TEXT.FIELDS_REQUIRED, NOTIFICATION_TYPE.ERROR);
        return;
    }

    // Show loading state
    showLoadingState();

    try {
        const response = await fetch(
            API_LOGIN,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    login_type: 'user',
                }),
            }
        );

        const data = await response.json();

        if (data.success) {
            showNotification(TEXT.LOGIN_SUCCESS, NOTIFICATION_TYPE.SUCCESS);
            // Store user data and account info
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('account', JSON.stringify(data.account));
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = ROUTE_DASHBOARD;
            }, TIMING.REDIRECT_DELAY);
        } else {
            showNotification(data.error || TEXT.LOGIN_ERROR, NOTIFICATION_TYPE.ERROR);
            hideLoadingState();
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(TEXT.GENERIC_ERROR, NOTIFICATION_TYPE.ERROR);
        hideLoadingState();
    }
}

function showLoadingState() {
    // Selectors
    const SELECTOR = {
        SUBMIT_BUTTON: 'button[type="submit"]',
        INPUTS: 'input'
    };
    
    // Icons
    const ICON = {
        SPINNER: 'fas fa-spinner fa-spin'
    };
    
    // Text
    const TEXT = {
        LOGGING_IN: 'Logging in...'
    };

    const submitBtn = document.querySelector(SELECTOR.SUBMIT_BUTTON);
    if (submitBtn) {
        submitBtn.innerHTML =
            `<i class="${ICON.SPINNER}"></i> ${TEXT.LOGGING_IN}`;
        submitBtn.disabled = true;
    }

    // Disable form inputs
    document.querySelectorAll(SELECTOR.INPUTS).forEach((input) => {
        input.disabled = true;
    });
}

function hideLoadingState() {
    // Selectors
    const SELECTOR = {
        SUBMIT_BUTTON: 'button[type="submit"]',
        INPUTS: 'input'
    };
    
    // Text
    const TEXT = {
        LOGIN: 'Login'
    };

    const submitBtn = document.querySelector(SELECTOR.SUBMIT_BUTTON);
    if (submitBtn) {
        submitBtn.innerHTML = TEXT.LOGIN;
        submitBtn.disabled = false;
    }

    // Re-enable form inputs
    document.querySelectorAll(SELECTOR.INPUTS).forEach((input) => {
        input.disabled = false;
    });
}

function togglePasswordVisibility(toggleBtn) {
    // Icons
    const ICON = {
        EYE: 'fas fa-eye',
        EYE_SLASH: 'fas fa-eye-slash'
    };

    const targetId = toggleBtn.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    const icon = toggleBtn.querySelector('i');

    if (passwordInput && icon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = ICON.EYE;
        } else {
            passwordInput.type = 'password';
            icon.className = ICON.EYE_SLASH;
        }
    }
}

function showNotification(message, type = 'info') {
    // Notification Types
    const NOTIFICATION_TYPE = {
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info'
    };
    
    // Icons
    const ICON = {
        SUCCESS: 'fa-check-circle',
        ERROR: 'fa-exclamation-circle',
        INFO: 'fa-info-circle',
        CLOSE: 'fas fa-times'
    };
    
    // Timing
    const TIMING = {
        NOTIFICATION_HIDE: 5000
    };
    
    // Selectors
    const SELECTOR = {
        NOTIFICATION: '.notification'
    };

    // Create notification container if it doesn't exist
    let container = document.querySelector(SELECTOR.NOTIFICATION);
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification';
        document.body.appendChild(container);
    }

    // Create notification content
    container.className = `notification notification-${type}`;
    container.innerHTML = `
        <div class="notification-content">
            <i class="fas ${
                type === NOTIFICATION_TYPE.SUCCESS
                    ? ICON.SUCCESS
                    : type === NOTIFICATION_TYPE.ERROR
                    ? ICON.ERROR
                    : ICON.INFO
            }"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="${ICON.CLOSE}"></i>
            </button>
        </div>
    `;

    // Auto-hide after some time
    setTimeout(() => {
        if (container.parentElement) {
            container.classList.add('hide');
            setTimeout(() => {
                if (container.parentElement) {
                    container.remove();
                }
            }, 300); // Animation duration
        }
    }, TIMING.NOTIFICATION_HIDE);
}

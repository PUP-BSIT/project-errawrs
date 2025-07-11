// API Endpoints and Routes are now imported from config.js

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

const API_LOGIN = API_ENDPOINTS.AUTH.LOGIN;

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
            showNotification('Login successful! Redirecting...', 'success');
            
            // Store user data in sessionStorage
            const userInfo = {
                id: data.user.id,
                username: data.user.username,
                name: `${data.user.first_name} ${data.user.last_name}`,
                phone_number: data.user.phone_number,
                type: 'user'
            };
            
            if (data.user.account) {
                userInfo.account = data.user.account;
            }
            
            sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            // Check session validity before redirect
            try {
                const sessionResponse = await fetch(API_ENDPOINTS.SESSION_CHECK, { credentials: 'include' });
                const sessionData = await sessionResponse.json();
                if (sessionData && sessionData.success && sessionData.authenticated) {
                    // Session is valid, redirect to dashboard
                    window.location.href = ROUTES.USER_DASHBOARD;
                } else {
                    console.error('Session invalid after login:', sessionData);
                    alert('Login failed: Session is not valid after login. See console for details.');
                }
            } catch (sessionError) {
                console.error('Error checking session after login:', sessionError);
                alert('Error checking session after login. See console for details.');
            }
        } else {
            showNotification(data.error || 'An unknown error occurred.', 'error');
            console.error('Login failed:', data);
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Failed to connect to the server.', 'error');
    } finally {
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
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    const icon = type === 'success' ? 'fa-check-circle' : 
                type === 'error' ? 'fa-exclamation-circle' : 
                'fa-info-circle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
            <button class="close-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add to container
    container.appendChild(notification);

    // Add close button functionality
    const closeBtn = notification.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

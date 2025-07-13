import { API_ENDPOINTS, ROUTES } from '/api_config.js';

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById("passwordInput");
    const toggleIcon = document.getElementById("toggleIcon");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
    } else {
        passwordInput.type = "password";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
    }
}
window.togglePassword = togglePassword;

// Show notification (error or success)
function showNotification(message, type = 'error', position = 'right') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification ${type}`;
    
    // Add center class if position is center
    if (position === 'center') {
        notificationDiv.classList.add('center');
    }
    
    notificationDiv.textContent = message;

    document.body.appendChild(notificationDiv);

    // Remove the notification after 5 seconds
    setTimeout(() => {
        if (notificationDiv.parentNode) {
            notificationDiv.remove();
        }
    }, 5000);
}

// Show error message
function showError(message) {
    showNotification(message, 'error', 'right');
}

// Show success message
function showSuccess(message) {
    showNotification(message, 'success', 'right');
}

// Show info message (centered)
function showInfo(message) {
    showNotification(message, 'info', 'center');
}

// Handle login submission
async function handleLogin(event) {
    if (event) {
        event.preventDefault();
    }

    const tellerNumber = document.getElementById("tellerNumber").value.trim();
    const password = document.getElementById("passwordInput").value;

    // Basic validation
    if (!tellerNumber || !password) {
        showError('Please fill in all fields');
        return;
    }

    if (tellerNumber.length < 1) {
        showError('Please enter a valid teller number');
        return;
    }

    if (password.length < 8) {
        showError('Password must be at least 8 characters long');
        return;
    }

    const loginButton = document.querySelector(".login-button");
    const originalButtonText = loginButton.textContent;
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        // Use centralized API config for login
        const response = await fetch(API_ENDPOINTS.TELLER_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                teller_number: tellerNumber,
                password: password,
                login_type: 'teller'
            })
        });
        const data = await response.json();
        if (data.success) {
            const tellerInfo = {
                teller_id: data.user.id,
                teller_number: data.user.teller_number,
                name: `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim(),
                type: data.type,
                email: data.user.email || '',
                logged_in_at: new Date().toISOString()
            };
            sessionStorage.setItem('tellerInfo', JSON.stringify(tellerInfo));
            showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = ROUTES.TELLER_DASHBOARD;
            }, 1000);
        } else {
            throw new Error(data.error || "Login failed");
        }
    } catch (error) {
        console.error('Login error:', error);
        loginButton.disabled = false;
        loginButton.textContent = originalButtonText;
        let errorMessage = 'Login failed. Please try again.';
        if (error.message.includes('fetch')) {
            errorMessage = 'Unable to connect to the server. Please check your internet connection and server status.';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Server configuration error. Please contact your administrator.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        showError(errorMessage);
    }
}

// Handle forgot password
function handleForgotPassword() {
    showInfo("Please contact your administrator to reset your password.");
}

// Add configuration check when page loads
document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Clear any existing session
    sessionStorage.removeItem('tellerInfo');
});
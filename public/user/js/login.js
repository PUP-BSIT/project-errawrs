// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeLogin);

function initializeLogin() {
    bindEvents();
}

function bindEvents() {
    const loginForm = document.getElementById('login_form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Password toggle button
    const passwordToggleBtn = document.querySelector('.password-toggle');
    if (passwordToggleBtn) {
        passwordToggleBtn.addEventListener('click', (e) => {
            togglePassword(e.target.closest('.password-toggle'));
        });
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.querySelector('button[type="submit"]');

    if (!usernameInput || !passwordInput || !submitBtn) {
        showNotification('Form elements not found', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Basic validation
    if (!username || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    // Show loading state
    showLoadingState();

    try {
        const response = await fetch('../../src/api/auth/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                login_type: 'user'
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Login successful! Redirecting...', 'success');
            // Store user data if needed
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('account', JSON.stringify(data.account));
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = './user_dashboard.html';
            }, 1500);
        } else {
            showNotification(data.error || 'Login failed', 'error');
            hideLoadingState();
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('An error occurred. Please try again.', 'error');
        hideLoadingState();
    }
}

function togglePassword(button) {
    if (!button) return;
    
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);
    const icon = button.querySelector('i');
    
    if (!input || !icon) return;
    
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    icon.className = isPassword ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function showLoadingState() {
    const submitBtn = document.querySelector('button[type="submit"]');
    const inputs = document.querySelectorAll('input');
    
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
    }
    
    inputs.forEach(input => {
        input.disabled = true;
    });
}

function hideLoadingState() {
    const submitBtn = document.querySelector('button[type="submit"]');
    const inputs = document.querySelectorAll('input');
    
    if (submitBtn) {
        submitBtn.innerHTML = 'Login';
        submitBtn.disabled = false;
    }
    
    inputs.forEach(input => {
        input.disabled = false;
    });
}

function showNotification(message, type = 'info') {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification notification-${type}`;
    notificationDiv.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>`;
    
    document.body.appendChild(notificationDiv);
    
    // Show with animation
    setTimeout(() => {
        notificationDiv.classList.add('show');
    }, 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideNotification(notificationDiv);
    }, 5000);
    
    // Close button handler
    const closeBtn = notificationDiv.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideNotification(notificationDiv);
        });
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-exclamation-circle';
        case 'warning':
            return 'fa-exclamation-triangle';
        default:
            return 'fa-info-circle';
    }
}

function hideNotification(notification) {
    if (!notification) return;
    
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
} 
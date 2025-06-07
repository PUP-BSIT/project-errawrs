// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login_form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Password toggle functionality
    const passwordToggle = document.querySelector('.password-toggle');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () =>
            togglePasswordVisibility(passwordToggle)
        );
    }
});

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
        const response = await fetch(
            '../../src/api/auth/login.php',
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
            // Store user data and account info
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

function showLoadingState() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
    }

    // Disable form inputs
    document.querySelectorAll('input').forEach((input) => {
        input.disabled = true;
    });
}

function hideLoadingState() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = 'Login';
        submitBtn.disabled = false;
    }

    // Re-enable form inputs
    document.querySelectorAll('input').forEach((input) => {
        input.disabled = false;
    });
}

function togglePasswordVisibility(toggleBtn) {
    const targetId = toggleBtn.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    const icon = toggleBtn.querySelector('i');

    if (passwordInput && icon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'fas fa-eye';
        } else {
            passwordInput.type = 'password';
            icon.className = 'fas fa-eye-slash';
        }
    }
}

function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification');
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
                type === 'success'
                    ? 'fa-check-circle'
                    : type === 'error'
                    ? 'fa-exclamation-circle'
                    : 'fa-info-circle'
            }"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Show notification
    container.classList.add('show');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        container.classList.remove('show');
        setTimeout(() => container.remove(), 300);
    }, 5000);
}

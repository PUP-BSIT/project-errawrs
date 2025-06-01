// Handle teller login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login_form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Password toggle functionality
    const passwordToggle = document.querySelector('.password-toggle');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => togglePasswordVisibility(passwordToggle));
    }
});

async function handleLogin(e) {
    e.preventDefault();

    const tellerNumberInput = document.getElementById('teller_number');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.querySelector('button[type="submit"]');

    if (!tellerNumberInput || !passwordInput || !submitBtn) {
        showNotification('Form elements not found', 'error');
        return;
    }

    const teller_number = tellerNumberInput.value.trim();
    const password = passwordInput.value;

    // Basic validation
    if (!teller_number || !password) {
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
                teller_number: teller_number,
                password: password,
                login_type: 'teller'
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Login successful! Redirecting...', 'success');
            // Store teller data if needed
            localStorage.setItem('teller', JSON.stringify(data.user));
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = './teller_dashboard.html';
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
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
    }

    // Disable form inputs
    document.querySelectorAll('input').forEach(input => {
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
    document.querySelectorAll('input').forEach(input => {
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
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
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

function handleForgotUsername() {
    alert(
        "This feature is still under development and will be available in the next update."
    );
    return false;
}

function handleForgotPassword() {
    alert(
        "This feature is still under development and will be available in the next update."
    );
    return false;
}
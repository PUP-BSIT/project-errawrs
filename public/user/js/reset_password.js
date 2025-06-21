document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('reset_password_form');
    const messageContainer = document.getElementById('message_container');
    const notificationContainer = document.querySelector('.notification-container');
    const tokenInput = document.getElementById('token');

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showMessage('No reset token found. Please request a new reset link.', 'error');
        return;
    }

    tokenInput.value = token;

    // Verify the token on page load
    verifyToken(token);

    async function verifyToken(token) {
        try {
            const response = await fetch(API_ENDPOINTS.VERIFY_RESET_TOKEN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
            });
            const result = await response.json();
            if (result.success) {
                form.style.display = 'block';
            } else {
                showMessage(result.error || 'Invalid or expired token.', 'error');
            }
        } catch (error) {
            showMessage('An error occurred while verifying your request. Please try again.', 'error');
        }
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        const submitButton = form.querySelector('button[type="submit"]');

        if (password.length < 8) {
            showNotification('Password must be at least 8 characters long.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Passwords do not match.', 'error');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Resetting...';

        try {
            const response = await fetch(API_ENDPOINTS.RESET_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, password: password })
            });

            const result = await response.json();

            if (result.success) {
                form.style.display = 'none';
                showMessage(result.message + ' You will be redirected to the login page shortly.', 'success');
                setTimeout(() => {
                    window.location.href = ROUTES.LOGIN;
                }, 5000);
            } else {
                showNotification(result.error || 'An unexpected error occurred.', 'error');
            }
        } catch (error) {
            showNotification('A network error occurred. Please try again.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Reset Password';
        }
    });

    function showMessage(message, type) {
        messageContainer.innerHTML = `<div class="notification notification-${type}">${message}</div>`;
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Password visibility toggles
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.dataset.target;
            const passwordInput = document.getElementById(targetId);
            const icon = this.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    });
}); 
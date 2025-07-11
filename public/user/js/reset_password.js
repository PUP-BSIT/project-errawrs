document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('reset_password_form');
    const notificationContainer = document.querySelector('.notification-container');

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showNotification('No reset token found. Please request a new reset link.', 'error');
        return;
    }

    // Verify the token on page load
    verifyToken(token);

    async function verifyToken(token) {
        try {
            const response = await fetch('../../src/api/user/verify_reset_token.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token })
            });
            const result = await response.json();
            if (result.success) {
                // Form is already visible by default, no need to change classes
                console.log('Token verified successfully');
            } else {
                showNotification(result.error || 'Invalid or expired token.', 'error');
            }
        } catch (error) {
            showNotification('An error occurred while verifying your request. Please try again.', 'error');
        }
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const password = document.getElementById('reset_username').value;
        const confirmPassword = document.getElementById('reset_password').value;
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
            const response = await fetch('../../src/api/user/reset_password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, password: password })
            });

            const result = await response.json();

            if (result.success) {
                // Hide form after successful reset
                form.style.display = 'none';
                showNotification(result.message + ' You will be redirected to the login page shortly.', 'success');
                setTimeout(() => {
                    window.location.href = './login_account_holder.html';
                }, 5000);
            } else {
                showNotification(result.error || 'An unexpected error occurred.', 'error');
            }
        } catch (error) {
            showNotification('A network error occurred. Please try again.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Confirm Reset';
        }
    });

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
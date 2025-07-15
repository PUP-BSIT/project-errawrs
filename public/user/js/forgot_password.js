document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('forgot_password_form');
    const notificationContainer = document.querySelector(
        '.notification-container'
    );

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const phoneNumber = document.getElementById('phone_number').value;
        const submitButton = form.querySelector('button[type="submit"]');

        if (!phoneNumber) {
            showNotification('Please enter a phone number.', 'error');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            const response = await fetch(API_ENDPOINTS.REQUEST_PASSWORD_RESET, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber }),
            });

            const result = await response.json();

            if (result.success) {
                showNotification(
                    'A password reset link has been sent to your registered email address.',
                    'success'
                );
                form.reset();
            } else {
                showNotification(
                    result.error || 'An unexpected error occurred.',
                    'error'
                );
            }
        } catch (error) {
            console.error('Forgot Password Error:', error);
            showNotification(
                'A network error occurred. Please try again.',
                'error'
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Reset Link';
        }
    });

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () =>
                notification.remove()
            );
        }, 5000);
    }
});

// Set up back to login link
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('back-to-login-link').href = ROUTES.LOGIN;
});
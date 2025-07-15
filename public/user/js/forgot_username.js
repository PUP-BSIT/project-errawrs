document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('forgot_username_form');
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
            const response = await fetch(API_ENDPOINTS.FORGOT_USERNAME, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber }),
            });

            const result = await response.json();

            if (result.success) {
                showNotification(
                    'An email with your username has been sent to your registered email address.',
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
            console.error('Forgot Username Error:', error);
            showNotification(
                'A network error occurred. Please try again.',
                'error'
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Recover Username';
        }
    });

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);

        // Add 'show' class after a short delay to trigger the transition
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Remove the notification after 5 seconds
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
    
    // Progressive Image Loading with Blur Effect
    const allImages = document.querySelectorAll('img');
    
    allImages.forEach(function(img) {
        // Check if image is already loaded
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            // Add event listeners for when image loads
            img.addEventListener('load', function() {
                this.classList.add('loaded');
            });
            
            // Fallback: if image fails to load or takes too long
            setTimeout(function() {
                if (!img.classList.contains('loaded')) {
                    img.classList.add('loaded');
                }
            }, 3000);
        }
    });
});

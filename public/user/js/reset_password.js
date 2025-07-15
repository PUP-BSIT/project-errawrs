document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('reset-password-form');
    const notificationContainer = document.getElementById('reset-message');

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showNotification(
            'No reset token found. Please request a new reset link.',
            'error'
        );
        return;
    }

    // Verify the token on page load
    verifyToken(token);

    async function verifyToken(token) {
        try {
            const response = await fetch(API_ENDPOINTS.VERIFY_RESET_TOKEN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token }),
            });
            const result = await response.json();
            if (result.success) {
                // Form is already visible by default, no need to change classes
                console.log('Token verified successfully');
            } else {
                showNotification(
                    result.error || 'Invalid or expired token.',
                    'error'
                );
                form.style.display = 'none';
            }
        } catch (error) {
            showNotification(
                'An error occurred while verifying your request. Please try again.',
                'error'
            );
            form.style.display = 'none';
        }
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const password = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitButton = form.querySelector('button[type="submit"]');

        if (password.length < 8) {
            showNotification(
                'Password must be at least 8 characters long.',
                'error'
            );
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
                body: JSON.stringify({ token: token, password: password }),
            });

            const result = await response.json();

            if (result.success) {
                // Replace form with success message and Go to Login button
                form.style.display = 'none';
                notificationContainer.innerHTML = `
                    <div style="text-align:center; margin-top:32px;">
                        <div style="font-size:2.5rem; color:#39d353; margin-bottom:12px;"><i class='fa fa-check-circle'></i></div>
                        <div style="font-size:1.1rem; font-weight:600; margin-bottom:18px; color:#222;">Your password has been reset successfully!</div>
                        <a href="/login" style="display:inline-block; background:#a7f535; color:#222; font-weight:700; padding:12px 32px; border-radius:6px; text-decoration:none; font-size:1.1rem; margin-top:10px;">
                            <i class="fa fa-sign-in-alt" style="margin-right:8px;"></i>Go to Login
                        </a>
                    </div>
                `;
            } else {
                showNotification(
                    result.error || 'An unexpected error occurred.',
                    'error'
                );
            }
        } catch (error) {
            showNotification(
                'A network error occurred. Please try again.',
                'error'
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Confirm Reset';
        }
    });

    function showNotification(message, type = 'info') {
        notificationContainer.innerHTML = `<div class="notification notification-${type}" style="margin-top:12px; text-align:center;">${message}</div>`;
    }

    // Password visibility toggles
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = document.getElementById(this.dataset.target);
            if (target.type === 'password') {
                target.type = 'text';
                this.querySelector('i').classList.remove('fa-eye');
                this.querySelector('i').classList.add('fa-eye-slash');
            } else {
                target.type = 'password';
                this.querySelector('i').classList.remove('fa-eye-slash');
                this.querySelector('i').classList.add('fa-eye');
            }
        });
    });
});

// Show session expired notification if redirected with ?expired=true
if (window.location.search.includes('expired=true')) {
    document.addEventListener('DOMContentLoaded', function () {
        showNotification(
            'Session expired. You were logged out due to inactivity. Please log in again to continue.',
            'error'
        );
    });
}
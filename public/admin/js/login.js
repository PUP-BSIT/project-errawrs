import { API_ENDPOINTS } from '/api_config.js';

// DOM Elements
let loginForm;
let usernameInput;
let passwordInput;

// Initialization

document.addEventListener('DOMContentLoaded', () => {
    loginForm = document.getElementById('admin_login_form');
    usernameInput = document.getElementById('username');
    passwordInput = document.getElementById('password');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
});

function showNotification(message, type = 'error') {
    // Remove any existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Trigger slide-in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
        showNotification('Please enter both username and password.', 'error');
        return;
    }
    try {
        const response = await fetch(API_ENDPOINTS.ADMIN_LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password, login_type: 'admin' })
        });
        const data = await response.json();
        if (data.success) {
            showNotification('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/admin/dashboard.html';
            }, 1200);
        } else {
            showNotification(data.message || 'Login failed.', 'error');
        }
    } catch (err) {
        showNotification('An error occurred. Please try again.', 'error');
    }
}

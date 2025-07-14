import { API_ENDPOINTS } from '/api_config.js';

// DOM Elements
let loginForm;
let usernameInput;
let passwordInput;
let errorMsg;

// Initialization

document.addEventListener('DOMContentLoaded', () => {
    loginForm = document.getElementById('admin_login_form');
    usernameInput = document.getElementById('username');
    passwordInput = document.getElementById('password');

    // Create error message element if not present
    errorMsg = document.getElementById('error_msg');
    if (!errorMsg && loginForm) {
        errorMsg = document.createElement('div');
        errorMsg.id = 'error_msg';
        errorMsg.style.color = 'red';
        errorMsg.style.marginTop = '10px';
        loginForm.appendChild(errorMsg);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
});

async function handleLoginSubmit(e) {
		e.preventDefault();
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
        showError('Please enter both username and password.');
			return;
		}
		try {
        showError('');
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
            window.location.href = '/admin/dashboard.html';
			} else {
            showError(data.message || 'Login failed.');
        }
    } catch (err) {
        showError('An error occurred. Please try again.');
    }
}

function showError(message) {
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = message ? 'block' : 'none';
    }
}

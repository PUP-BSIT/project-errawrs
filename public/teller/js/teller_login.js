// Configuration - API base URL
const API_BASE_URL = '../api'; // Using relative path to the API directory

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById("passwordInput");
    const toggleIcon = document.getElementById("toggleIcon");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
    } else {
        passwordInput.type = "password";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
    }
}

// Show message (error or success)
function showMessage(message, type = 'error') {
    // Remove any existing message
    const existingMessage = document.querySelector('.message-container');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message-container ${type}-message`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // Remove the message after 5 seconds with fade out animation
    setTimeout(() => {
        messageDiv.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 4700);
}

// Test API connectivity
async function testAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
            method: 'OPTIONS',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        return response.ok || response.status === 200;
    } catch (error) {
        console.error('API connection test failed:', error);
        return false;
    }
}

// Handle login submission
async function handleLogin(event) {
    // Always prevent the default form submission first
    if (event) {
        event.preventDefault();
    }

    const tellerNumber = document.getElementById("tellerNumber").value.trim();
    const password = document.getElementById("passwordInput").value;

    // Basic validation
    if (!tellerNumber || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    // Validate teller number format (basic check)
    if (tellerNumber.length < 1) {
        showMessage('Please enter a valid teller number', 'error');
        return;
    }

    // Validate password length
    if (password.length < 8) {
        showMessage('Password must be at least 8 characters long', 'error');
        return;
    }

    // Disable login button and show loading state
    const loginButton = document.querySelector(".login-button");
    const originalButtonText = loginButton.textContent;
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        // Test API connection first
        const isConnected = await testAPIConnection();
        if (!isConnected) {
            throw new Error('Unable to connect to the server. Please check if the server is running and try again.');
        }

        // Prepare login data
        const loginData = {
            teller_number: tellerNumber,
            password: password,
            login_type: 'teller'
        };

        // Send login request to backend
        const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(loginData),
            credentials: 'include'
        });

        // Handle different response types
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned an invalid response. Please check server configuration.');
        }

        if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
        }

        if (data.success) {
            // Store teller info in session storage
            const tellerInfo = {
                teller_id: data.user.id,
                teller_number: data.user.teller_number,
                name: `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim(),
                type: data.type,
                email: data.user.email || '',
                logged_in_at: new Date().toISOString()
            };

            sessionStorage.setItem('tellerInfo', JSON.stringify(tellerInfo));

            // Show success message briefly before redirect
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = './bank_teller_dashboard.html';
            }, 1000);
        } else {
            throw new Error(data.error || "Login failed");
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Reset button state
        loginButton.disabled = false;
        loginButton.textContent = originalButtonText;
        
        // Show specific error messages
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.message.includes('fetch')) {
            errorMessage = 'Unable to connect to the server. Please check your internet connection and server status.';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Server configuration error. Please contact your administrator.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showMessage(errorMessage, 'error');
    }
}

// Handle forgot username
function handleForgotUsername() {
    showMessage("Please contact your administrator to recover your username.", 'error');
}

// Handle forgot password
function handleForgotPassword() {
    showMessage("Please contact your administrator to reset your password.", 'error');
}

// Add configuration check when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('API Base URL:', API_BASE_URL);
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Clear any existing session
    sessionStorage.removeItem('tellerInfo');

    // Test API connection and show status
    try {
        const isConnected = await testAPIConnection();
        if (!isConnected) {
            showMessage('Warning: Unable to connect to the server. Please ensure your local server is running.', 'error');
        }
    } catch (error) {
        console.error('Initial connection test failed:', error);
        showMessage('Warning: Server connection could not be established. Please check your setup.', 'error');
    }
});
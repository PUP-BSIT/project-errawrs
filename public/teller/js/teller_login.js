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

// Show error message
function showError(message) {
    // Remove any existing error message
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = 'color: #dc3545; margin-top: 10px; text-align: center; padding: 10px;';
    errorDiv.textContent = message;

    const loginForm = document.getElementById('loginForm');
    loginForm.appendChild(errorDiv);

    // Remove the error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Handle login submission
async function handleLogin(event) {
    // Always prevent the default form submission first
    if (event) {
        event.preventDefault();
    }

    const tellerNumber = document.getElementById("tellerNumber").value;
    const password = document.getElementById("passwordInput").value;

    // Basic validation
    if (!tellerNumber || !password) {
        showError('Please fill in all fields');
        return;
    }

    // Disable login button and show loading state
    const loginButton = document.querySelector(".login-button");
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        // Prepare login data
        const loginData = {
            teller_number: tellerNumber,
            password: password,
            login_type: 'teller'
        };

        // Send login request to backend
        const response = await fetch("http://localhost/project-errawrs/src/api/auth/login.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(loginData),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
        }

        const data = await response.json();

        if (data.success) {
            // Store teller info in session storage
            sessionStorage.setItem('tellerInfo', JSON.stringify({
                teller_id: data.user.id,
                teller_number: data.user.teller_number,
                name: `${data.user.first_name} ${data.user.last_name}`,
                type: data.type
            }));

            // Redirect to dashboard
            window.location.href = './bank_teller_dashboard.html';
        } else {
            throw new Error(data.error || "Login failed");
        }
    } catch (error) {
        console.error('Login error:', error);
        // Reset button state
        loginButton.disabled = false;
        loginButton.textContent = "log in";
        // Show error to user
        showError(error.message || 'Login failed. Please check your credentials and try again.');
    }
}

// Handle forgot username
function handleForgotUsername() {
    alert("Please contact your administrator to recover your username.");
}

// Handle forgot password
function handleForgotPassword() {
    alert("Please contact your administrator to reset your password.");
}

// Add configuration check when page loads
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Clear any existing session
    sessionStorage.removeItem('tellerInfo');

    // Test API connection
    fetch("http://localhost/project-errawrs/src/api/auth/login.php", {
        method: 'OPTIONS',
        credentials: 'include'
    }).catch(() => {
        showError('Unable to connect to the server. Please check your connection and try again.');
    });
});
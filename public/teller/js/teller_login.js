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

// Handle login submission
function handleLogin(event) {
    // Always prevent the default form submission first
    if (event) {
        event.preventDefault();
    }

    const tellerNumber = document.getElementById("tellerNumber").value;
    const password = document.getElementById("passwordInput").value;

    // Basic validation
    if (!tellerNumber || !password) {
        alert('Please fill in all fields');
        return;
    }

    // Disable login button and show loading state
    const loginButton = document.querySelector(".login-button");
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    // Get the base URL dynamically
    const baseUrl = window.location.pathname.includes('/public/') 
        ? window.location.pathname.split('/public/')[0] 
        : '';

    // Prepare login data
    const loginData = {
        teller_number: tellerNumber,
        password: password,
        login_type: 'teller'
    };

    // Send login request to backend using relative path
    fetch(`${baseUrl}/src/api/auth/login.php`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(loginData)
    })
    .then((response) => {
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Server configuration error. Please make sure the project is set up correctly in your web server.');
            }
            return response.json().then(data => {
                throw new Error(data.error || 'Login failed');
            });
        }
        return response.json();
    })
    .then((data) => {
        if (data.success) {
            // Store teller info in session storage
            sessionStorage.setItem('tellerInfo', JSON.stringify({
                teller_id: data.user.id,
                teller_number: data.user.teller_number,
                name: `${data.user.first_name} ${data.user.last_name}`,
                type: data.type
            }));

            // Redirect to dashboard immediately
            window.location.href = './bank_teller_dashboard.html';
        } else {
            throw new Error(data.error || "Login failed");
        }
    })
    .catch((error) => {
        console.error('Login error:', error);
        // Reset button state
        loginButton.disabled = false;
        loginButton.textContent = "log in";
        // Show error to user
        if (error.message.includes('configuration error')) {
            alert('Server Configuration Error:\n\n' +
                  '1. Make sure XAMPP/Apache is running\n' +
                  '2. Verify the project is in the correct directory (htdocs)\n' +
                  '3. Check if the project folder name is "project-errawrs"\n' +
                  '4. Ensure database connection settings are correct');
        } else {
            alert(error.message || 'Login failed. Please check your credentials and try again.');
        }
    });
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

    // Check server configuration
    fetch(`${window.location.pathname.split('/public/')[0]}/src/api/auth/login.php`, {
        method: 'OPTIONS'
    }).catch(() => {
        const configAlert = document.createElement('div');
        configAlert.style.cssText = 'background-color: #fff3cd; color: #856404; padding: 10px; margin: 10px 0; border-radius: 4px; text-align: center;';
        configAlert.innerHTML = `
            <strong>Server Configuration Check Failed</strong><br>
            Please ensure:<br>
            1. XAMPP/Apache is running<br>
            2. Project is in htdocs folder<br>
            3. Folder name is "project-errawrs"<br>
            4. Database configuration is correct
        `;
        loginForm.insertBefore(configAlert, loginForm.firstChild);
    });
});
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

    // Disable login button and show loading state
    const loginButton = document.querySelector(".login-button");
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    // Prepare login data
    const loginData = {
        teller_number: tellerNumber,
        password: password,
        login_type: 'teller'  // Add login type for the unified auth endpoint
    };

    // Send login request to backend
    fetch("/project-errawrs/src/api/auth/login.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(loginData)
    })
    .then((response) => response.json())
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
            window.location.href = '../teller/bank_teller_dashboard.html';
        } else {
            throw new Error(data.error || "Login failed");
        }
    })
    .catch((error) => {
        console.error("Login error:", error);

        // Reset button
        loginButton.disabled = false;
        loginButton.textContent = "log in";

        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.textContent = error.message || "Login failed. Please check your credentials and try again.";
        errorMessage.style.color = 'red';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.marginTop = '10px';
        loginButton.parentNode.insertBefore(errorMessage, loginButton.nextSibling);

        // Remove error message after 3 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 3000);
    });

    // Prevent form submission
    return false;
}

// Handle forgot username
function handleForgotUsername() {
    alert("Please contact your administrator to recover your username.");
}

// Handle forgot password
function handleForgotPassword() {
    alert("Please contact your administrator to reset your password.");
}

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    // Clear any existing session
    sessionStorage.removeItem('tellerInfo');
    
    // Add form submit handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const tellerInfo = sessionStorage.getItem('tellerInfo');
    if (tellerInfo && window.location.pathname.includes('bank_teller_login.html')) {
        window.location.href = '../teller/bank_teller_dashboard.html';
    }
});
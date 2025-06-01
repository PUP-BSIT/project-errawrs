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
function handleLogin() {
    const tellerNumber = document.getElementById("tellerNumber").value;
    const password = document.getElementById("passwordInput").value;

    // Disable login button and show loading state
    const loginButton = document.querySelector(".login-button");
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    // Prepare login data
    const loginData = {
        tellerNumber: tellerNumber,
        password: password,
    };

    // Send login request to backend
    fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Login failed");
            }
            return response.json();
        })
        .then((data) => {
            console.log("Login successful:", data);
        })
        .catch((error) => {
            console.error("Login error:", error);

            // Reset button
            loginButton.disabled = false;
            loginButton.textContent = "log in";

            // Show error message to user
            alert("Login failed. Please check your credentials and try again.");
        });

    return false; // Prevent default form submission
}

function handleForgotUsername() {
    alert(
        "This feature is still under development and will be available in the next update."
    );
    return false;
}

function handleForgotPassword() {
    alert(
        "This feature is still under development and will be available in the next update."
    );
    return false;
}
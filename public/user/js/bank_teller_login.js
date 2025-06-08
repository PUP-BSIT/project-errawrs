// API Endpoints
const API_LOGIN = '../../src/api/auth/login.php';

// Element IDs
const ELEMENT_ID = {
    PASSWORD_INPUT: 'passwordInput',
    TOGGLE_ICON: 'toggleIcon',
    TELLER_NUMBER: 'tellerNumber'
};

// CSS Classes and Selectors
const CLASS = {
    EYE: 'fa-eye',
    EYE_SLASH: 'fa-eye-slash',
    LOGIN_BUTTON: '.login-button'
};

// Input Types
const INPUT_TYPE = {
    PASSWORD: 'password',
    TEXT: 'text'
};

// Text Content
const TEXT = {
    LOGIN: 'log in',
    LOGGING_IN: 'Logging in...',
    LOGIN_ERROR: 'Login failed. Please check your credentials and try again.',
    FEATURE_DEVELOPMENT: 'This feature is still under development and will be available in the next update.',
    LOGIN_FAILED: 'Login failed'
};

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById(ELEMENT_ID.PASSWORD_INPUT);
    const toggleIcon = document.getElementById(ELEMENT_ID.TOGGLE_ICON);

    if (passwordInput.type === INPUT_TYPE.PASSWORD) {
        passwordInput.type = INPUT_TYPE.TEXT;
        toggleIcon.classList.remove(CLASS.EYE_SLASH);
        toggleIcon.classList.add(CLASS.EYE);
    } else {
        passwordInput.type = INPUT_TYPE.PASSWORD;
        toggleIcon.classList.remove(CLASS.EYE);
        toggleIcon.classList.add(CLASS.EYE_SLASH);
    }
}

// Handle login submission
function handleLogin() {
    const tellerNumber = document.getElementById(ELEMENT_ID.TELLER_NUMBER).value;
    const password = document.getElementById(ELEMENT_ID.PASSWORD_INPUT).value;

    // Disable login button and show loading state
    const loginButton = document.querySelector(CLASS.LOGIN_BUTTON);
    loginButton.disabled = true;
    loginButton.textContent = TEXT.LOGGING_IN;

    // Prepare login data
    const loginData = {
        tellerNumber: tellerNumber,
        password: password,
    };

    // Send login request to backend
    fetch(API_LOGIN, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(TEXT.LOGIN_FAILED);
            }
            return response.json();
        })
        .then((data) => {
            console.log('Login successful:', data);
        })
        .catch((error) => {
            console.error('Login error:', error);

            // Reset button
            loginButton.disabled = false;
            loginButton.textContent = TEXT.LOGIN;

            // Show error message to user
            alert(TEXT.LOGIN_ERROR);
        });

    return false; // Prevent default form submission
}

function handleForgotUsername() {
    alert(TEXT.FEATURE_DEVELOPMENT);
    return false;
}

function handleForgotPassword() {
    alert(TEXT.FEATURE_DEVELOPMENT);
    return false;
}

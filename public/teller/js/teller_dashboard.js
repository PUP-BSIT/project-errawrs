// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "./bank_teller_login.html";
}

// Update teller name in the UI
document.addEventListener("DOMContentLoaded", () => {
    const userNameElement = document.querySelector(".user-name");
    if (userNameElement && tellerInfo.name) {
        userNameElement.textContent = tellerInfo.name;
    }
});

// Handle logout
document.querySelector('.nav-logout a').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Clear session storage
    sessionStorage.removeItem('tellerInfo');
    
    // Redirect to login page
    window.location.href = './bank_teller_login.html';
});

// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    const tellerInfo = sessionStorage.getItem('tellerInfo');
    if (!tellerInfo) {
        window.location.href = './bank_teller_login.html';
    }
}); 
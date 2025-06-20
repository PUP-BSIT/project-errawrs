document.addEventListener('DOMContentLoaded', async () => {
    // Get teller info from session storage (like dashboard)
    const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
    if (!tellerInfo || !tellerInfo.teller_number) {
        console.error("No teller info found in session storage");
        window.location.href = "./bank_teller_login.html";
        return;
    }

    const userName = document.getElementById('user_name');
    const dynamicAvatars = document.querySelectorAll('.dynamic-avatar');

    const firstNameElem = document.getElementById('first_name');
    const lastNameElem = document.getElementById('last_name');
    const emailElem = document.getElementById('email_address');
    const statusElem = document.getElementById('status');

    // Set user name and avatar like dashboard
    let fullName = '';
    if (tellerInfo.first_name && tellerInfo.last_name) {
        fullName = `${tellerInfo.first_name} ${tellerInfo.last_name}`;
        userName.textContent = fullName;
    } else if (tellerInfo.name) {
        fullName = tellerInfo.name;
        userName.textContent = tellerInfo.name;
    }

    // Set avatar initial (matching dashboard logic)
    if (dynamicAvatars.length > 0 && fullName) {
        const initial = fullName.trim().charAt(0).toUpperCase();
        dynamicAvatars.forEach(avatar => {
            avatar.textContent = initial;
        });
    }

    // Populate account info from session data
    if (tellerInfo.first_name) firstNameElem.textContent = tellerInfo.first_name;
    if (tellerInfo.last_name) lastNameElem.textContent = tellerInfo.last_name;
    if (tellerInfo.email_address) emailElem.textContent = tellerInfo.email_address;
    if (tellerInfo.status) {
        statusElem.textContent = tellerInfo.status;
        statusElem.className = `value status-${tellerInfo.status.toLowerCase()}`;
    }
}); 
import { API_ENDPOINTS } from '/api_config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Get teller info from session storage (like dashboard)
    const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
    if (!tellerInfo || !tellerInfo.teller_number) {
        console.error("No teller info found in session storage");
        window.location.href = "/login";
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

    // Try to get detailed teller information from API
    try {
        const response = await fetch(`${API_ENDPOINTS.TELLER_PROFILE}?teller_number=${tellerInfo.teller_number}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Use API data for detailed information
                firstNameElem.textContent = data.first_name || '';
                lastNameElem.textContent = data.last_name || '';
                emailElem.textContent = data.email_address || '';
                statusElem.textContent = data.status || 'Active';
                statusElem.className = `value status-${(data.status || 'active').toLowerCase()}`;
            } else {
                // Fallback to session data
                populateFromSessionData();
            }
        } else {
            // Fallback to session data
            populateFromSessionData();
        }
    } catch (error) {
        console.error('Error fetching detailed profile:', error);
        // Fallback to session data
        populateFromSessionData();
    }

    function populateFromSessionData() {
        // Parse name from session storage
        if (tellerInfo.name) {
            const nameParts = tellerInfo.name.trim().split(' ');
            if (nameParts.length >= 2) {
                firstNameElem.textContent = nameParts[0];
                lastNameElem.textContent = nameParts.slice(1).join(' ');
            } else {
                firstNameElem.textContent = tellerInfo.name;
                lastNameElem.textContent = '';
            }
        }
        
        if (tellerInfo.email) {
            emailElem.textContent = tellerInfo.email;
        }
        
        // Default status
        statusElem.textContent = 'Active';
        statusElem.className = 'value status-active';
    }
}); 
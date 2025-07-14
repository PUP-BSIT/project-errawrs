// public/teller/js/logout.js

import { API_ENDPOINTS } from '/api_config.js';

function tellerLogout() {
    fetch(API_ENDPOINTS.TELLER_LOGOUT, {
        method: 'POST',
        credentials: 'include'
    }).finally(() => {
        sessionStorage.removeItem('tellerInfo');
        window.location.href = '/login';
    });
}

window.tellerLogout = tellerLogout; 
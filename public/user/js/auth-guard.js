document.addEventListener('DOMContentLoaded', () => {
    const API_ENDPOINT = API_ENDPOINTS.SESSION_CHECK;

    const sessionCheck = async () => {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = ROUTES.LOGIN;
                return;
            }

            const data = await response.json();

            if (data.success && data.user) {
                sessionStorage.setItem('userData', JSON.stringify(data.user));
                updateSidebar(data.user);
            } else {
                console.log('Session check failed, redirecting to login');
                window.location.href = ROUTES.LOGIN;
                return;
            }
        } catch (error) {
            console.error('Session check error:', error);
            sessionStorage.removeItem('userData');
            window.location.href = ROUTES.LOGIN;
        }
    };

    const updateSidebar = (user) => {
        const { first_name, last_name, username } = user;

        const userNameEl = document.getElementById('user_name');
        if (userNameEl) {
            userNameEl.textContent = `${first_name} ${last_name}`;
        }

        const userAvatarEl = document.getElementById('user_avatar_container');
        if (userAvatarEl) {
            const initial = (first_name || 'U').charAt(0).toUpperCase();
            userAvatarEl.textContent = initial;
            userAvatarEl.style.backgroundColor = '#FFFFFF';
            userAvatarEl.style.color = '#000000';
        }
    };

    sessionCheck();
});

// Session guard for all protected pages
async function checkSession() {
    try {
        const resp = await fetch(API_ENDPOINTS.AUTH.SESSION_CHECK, {
            credentials: 'include'
        });
        const data = await resp.json();
        if (!data.success || !data.authenticated) {
            window.location.href = ROUTES.LOGIN + '?expired=true';
        }
    } catch (e) {
        window.location.href = ROUTES.LOGIN + '?expired=true';
    }
}

// Call this on every protected page
checkSession();

// On the login page, show a notification if redirected due to session expiry
if (window.location.search.includes('expired=true')) {
    if (typeof showNotification === 'function') {
        showNotification('Your session has expired. Please log in again.', 'error');
    } else {
        alert('Your session has expired. Please log in again.');
    }
} 
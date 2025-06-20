document.addEventListener('DOMContentLoaded', () => {
    const API_ENDPOINT = '/project-errawrs/src/api/auth/session_check.php';

    const sessionCheck = async () => {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/project-errawrs/public/user/login_account_holder.html';
                return;
            }

            const data = await response.json();

            if (data.success && data.user) {
                sessionStorage.setItem('userData', JSON.stringify(data.user));
                updateSidebar(data.user);
            } else {
                 sessionStorage.removeItem('userData');
                 window.location.href = '/project-errawrs/public/user/login_account_holder.html';
            }
        } catch (error) {
            console.error('Session check failed:', error);
            sessionStorage.removeItem('userData');
            window.location.href = '/project-errawrs/public/user/login_account_holder.html';
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
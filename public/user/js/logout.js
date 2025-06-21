document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout_btn');

    const handleLogout = async () => {
        try {
            const response = await fetch('/project-errawrs/src/api/auth/logout.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                window.location.href = '/project-errawrs/public/user/login_account_holder.html';
            } else {
                console.error('Logout failed:', result.error);
                // Even if server-side logout fails, force redirect
                window.location.href = '/project-errawrs/public/user/login_account_holder.html';
            }
        } catch (error) {
            console.error('An error occurred during logout:', error);
            // Force redirect on error
            window.location.href = '/project-errawrs/public/user/login_account_holder.html';
        }
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}); 
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout_btn');

    const handleLogout = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.LOGOUT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                // Clear session storage
                sessionStorage.clear();
                // Redirect to login page
                window.location.href = "/login";
            } else {
                console.error('Logout failed:', result.error);
                // Even if server-side logout fails, force redirect
                sessionStorage.clear();
                window.location.href = "/login";
            }
        } catch (error) {
            console.error('An error occurred during logout:', error);
            // Force redirect on error
            sessionStorage.clear();
            window.location.href = "/login";
        }
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}); 
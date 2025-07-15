// Show error message from URL if present
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const errorMsg = params.get('error_message');
    if (errorMsg) {
        document.getElementById('fail-message').textContent =
            decodeURIComponent(errorMsg.replace(/\+/g, ' '));
    }
}); 
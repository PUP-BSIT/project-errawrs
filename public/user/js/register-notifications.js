// Notification logic for registration

export function showNotification(message, type = 'info') {
    // Remove any existing notification
    const existing = document.querySelector('.notification.custom-visible');
    if (existing) existing.remove();

    const notification = document.createElement("div");
    notification.className = `notification custom-visible ${type}`;
    let icon;
    switch (type) {
        case 'success': icon = "fa-check-circle"; break;
        case 'error': icon = "fa-times-circle"; break;
        case 'warning': icon = "fa-exclamation-triangle"; break;
        default: icon = "fa-info-circle";
    }
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
            <button class="notification-close" aria-label="Close notification">&times;</button>
        </div>
    `;
    document.body.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add("show"));
    // Manual close
    notification.querySelector('.notification-close').onclick = () => notification.remove();
    // Auto-hide after 5s
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 5000);
} 
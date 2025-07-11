// Notification logic for registration

export function showNotification(message, type = 'info') {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    let icon;
    switch (type) {
        case 'success': icon = "fa-check-circle"; break;
        case 'error': icon = "fa-times-circle"; break;
        case 'warning': icon = "fa-exclamation-triangle"; break;
        default: icon = "fa-info-circle";
    }
    notification.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add("show"));
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 3000);
} 
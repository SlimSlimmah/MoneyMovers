// In-game notification system
export function showNotification(message, type = 'success', duration = 3000) {
    // Remove any existing notifications
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    // Create notification element
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    
    // Add to page
    document.body.appendChild(notif);
    
    // Remove after duration
    setTimeout(() => {
        notif.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, duration);
}
/**
 * Session Manager
 * Handles session tracking, timeout, and auto-refresh
 */
class SessionManager {
    constructor(options = {}) {
        // Default options
        this.options = {
            checkInterval: 30000, // Check session every 30 seconds
            warningThreshold: 60, // Show warning when 60 seconds left
            sessionEndpoint: '../../src/api/auth/session_check.php',
            loginPage: './login_account_holder.html',
            onTimeout: null, // Custom callback for timeout
            onWarning: null, // Custom callback for warning
            debug: false,
            ...options
        };

        // State
        this.timer = null;
        this.warningTimer = null;
        this.sessionData = null;
        this.lastActivity = Date.now();
        this.warningShown = false;

        // Bind methods
        this.checkSession = this.checkSession.bind(this);
        this.resetTimer = this.resetTimer.bind(this);
        this.showWarning = this.showWarning.bind(this);
        this.handleTimeout = this.handleTimeout.bind(this);
        this.trackActivity = this.trackActivity.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize session tracking
     */
    init() {
        this.log('Initializing session manager');
        
        // Start session check timer
        this.timer = setInterval(this.checkSession, this.options.checkInterval);
        
        // Track user activity
        this.setupActivityTracking();
        
        // Initial session check
        this.checkSession();
    }

    /**
     * Set up event listeners to track user activity
     */
    setupActivityTracking() {
        // Track mouse movement, clicks, key presses, scrolling
        const activityEvents = [
            'mousemove', 'mousedown', 'keypress', 
            'scroll', 'touchstart', 'click'
        ];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, this.trackActivity);
        });
        
        // Also track tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.trackActivity();
            }
        });
    }

    /**
     * Track user activity
     */
    trackActivity() {
        this.lastActivity = Date.now();
        this.resetTimer();
        
        // Clear warning if shown
        if (this.warningShown) {
            this.hideWarning();
        }
    }

    /**
     * Reset the inactivity timer
     */
    resetTimer() {
        // Clear warning timer if exists
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }

    /**
     * Check if session is still valid
     */
    async checkSession() {
        try {
            // Calculate inactivity time in seconds
            const inactivityTime = Math.floor((Date.now() - this.lastActivity) / 1000);
            
            // If user has been inactive for too long, don't bother checking session
            if (inactivityTime >= 300) { // 5 minutes
                this.handleTimeout();
                return;
            }
            
            // Call session check endpoint
            const response = await fetch(this.options.sessionEndpoint);
            const data = await response.json();
            
            if (data.success && data.authenticated) {
                this.sessionData = data;
                
                // Calculate time until session expires
                const expiresIn = data.user.session_expires_in - 
                    (Math.floor(Date.now() / 1000) - data.user.last_activity);
                
                this.log(`Session valid, expires in ${expiresIn} seconds`);
                
                // Show warning if approaching timeout
                if (expiresIn <= this.options.warningThreshold && !this.warningShown) {
                    this.showWarning(expiresIn);
                }
            } else {
                // Session expired or invalid
                this.handleTimeout();
            }
        } catch (error) {
            this.log('Error checking session:', error);
        }
    }

    /**
     * Show session expiry warning
     */
    showWarning(timeLeft) {
        this.warningShown = true;
        
        // Use custom warning handler if provided
        if (typeof this.options.onWarning === 'function') {
            this.options.onWarning(timeLeft);
            return;
        }
        
        // Default warning
        const warningEl = document.createElement('div');
        warningEl.id = 'session-warning';
        warningEl.innerHTML = `
            <div class="session-warning-content">
                <h3>Your session is about to expire</h3>
                <p>You will be logged out in <span id="session-countdown">${timeLeft}</span> seconds due to inactivity.</p>
                <button id="session-continue">Continue Session</button>
            </div>
        `;
        
        // Add styles
        warningEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        warningEl.querySelector('.session-warning-content').style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 5px;
            max-width: 400px;
            text-align: center;
        `;
        
        warningEl.querySelector('#session-continue').style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 15px;
        `;
        
        document.body.appendChild(warningEl);
        
        // Add continue button handler
        document.getElementById('session-continue').addEventListener('click', () => {
            this.trackActivity();
        });
        
        // Start countdown
        let countdown = timeLeft;
        const countdownEl = document.getElementById('session-countdown');
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    /**
     * Hide the warning dialog
     */
    hideWarning() {
        this.warningShown = false;
        const warningEl = document.getElementById('session-warning');
        if (warningEl) {
            warningEl.remove();
        }
    }

    /**
     * Handle session timeout
     */
    handleTimeout() {
        // Use custom timeout handler if provided
        if (typeof this.options.onTimeout === 'function') {
            this.options.onTimeout();
            return;
        }
        
        // Default timeout behavior - redirect to login
        alert('Your session has expired due to inactivity. Please log in again.');
        window.location.href = this.options.loginPage;
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clear timers
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
        }
        
        // Remove event listeners
        const activityEvents = [
            'mousemove', 'mousedown', 'keypress', 
            'scroll', 'touchstart', 'click'
        ];
        
        activityEvents.forEach(event => {
            document.removeEventListener(event, this.trackActivity);
        });
        
        document.removeEventListener('visibilitychange', this.trackActivity);
        
        this.log('Session manager destroyed');
    }

    /**
     * Log debug messages
     */
    log(...args) {
        if (this.options.debug) {
            console.log('[SessionManager]', ...args);
        }
    }
}

// Initialize session manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on authenticated pages
    if (document.body.classList.contains('authenticated-page')) {
        window.sessionManager = new SessionManager();
    }
}); 
/**
 * Session Manager
 * Handles session tracking, timeout, and auto-refresh
 */
class SessionManager {
    constructor(options = {}) {
        // Default Settings
        const DEFAULT_SETTINGS = {
            CHECK_INTERVAL: 30000, // Check session every 30 seconds
            WARNING_THRESHOLD: 60, // Show warning when 1 minute left
            INACTIVITY_THRESHOLD: 300, // 5 minutes
        };

        // Default options
        this.options = {
            checkInterval: DEFAULT_SETTINGS.CHECK_INTERVAL,
            warningThreshold: DEFAULT_SETTINGS.WARNING_THRESHOLD,
            sessionEndpoint: API_ENDPOINTS.SESSION_CHECK,
            loginPage: ROUTES.LOGIN,
            onTimeout: null, // Custom callback for timeout
            onWarning: null, // Custom callback for warning
            debug: false,
            ...options,
        };

        // State
        this.timer = null;
        this.warningTimer = null;
        this.sessionData = null;
        this.lastActivity = Date.now();
        this.warningShown = false;
        this.isAuthenticated = false;

        // Bind methods
        this.checkSession = this.checkSession.bind(this);
        this.resetTimer = this.resetTimer.bind(this);
        this.showWarning = this.showWarning.bind(this);
        this.handleTimeout = this.handleTimeout.bind(this);
        this.trackActivity = this.trackActivity.bind(this);
        this.handlePageHide = this.handlePageHide.bind(this);
        this.handlePageShow = this.handlePageShow.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize session tracking
     */
    init() {
        // Text Content
        const TEXT = {
            INIT_MESSAGE: 'Initializing session manager',
        };

        this.log(TEXT.INIT_MESSAGE);

        // Check for session immediately on page load
        this.checkSession(true)
            .then((isAuthenticated) => {
                if (!isAuthenticated) {
                    this.redirectToLogin();
                    return;
                }

                // Start session check timer only if authenticated
                this.timer = setInterval(
                    this.checkSession,
                    this.options.checkInterval
                );

                // Track user activity
                this.setupActivityTracking();

                // Add page visibility and navigation listeners
                this.setupNavigationTracking();
            })
            .catch((error) => {
                console.error('Session check failed:', error);
                // Don't redirect on initial error, give it another chance
                this.timer = setInterval(
                    this.checkSession,
                    this.options.checkInterval
                );
            });
    }

    /**
     * Set up event listeners to track user activity
     */
    setupActivityTracking() {
        // User Activity Events
        const ACTIVITY_EVENTS = [
            'mousemove',
            'mousedown',
            'keypress',
            'scroll',
            'touchstart',
            'click',
        ];

        // Track mouse movement, clicks, key presses, scrolling
        ACTIVITY_EVENTS.forEach((event) => {
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
     * Set up tracking for page navigation events
     */
    setupNavigationTracking() {
        // Handle page visibility events
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page becomes visible again - check session
                this.checkSession();
            }
        });

        // Handle navigation events (page show/hide)
        window.addEventListener('pagehide', this.handlePageHide);
        window.addEventListener('pageshow', this.handlePageShow);

        // Handle history API for back/forward navigation
        window.addEventListener('popstate', () => {
            this.checkSession();
        });

        // Add state to history to detect back button
        if (history.pushState) {
            history.pushState(
                { authenticated: true },
                document.title,
                window.location.href
            );
        }
    }

    /**
     * Handle page hiding (before unload or navigation)
     */
    handlePageHide() {
        // Store timestamp to calculate time away
        sessionStorage.setItem('page_hide_time', Date.now());
    }

    /**
     * Handle page showing (after load or navigation back)
     * @param {Event} e - The pageshow event
     */
    handlePageShow(e) {
        // If navigating back (persisted is true), check session
        if (e.persisted) {
            const hideTime = parseInt(
                sessionStorage.getItem('page_hide_time') || '0',
                10
            );
            const timeAway = Date.now() - hideTime;

            // If away for more than 5 seconds, check session
            if (timeAway > 5000) {
                this.checkSession();
            }
        }
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
     * @param {boolean} isInitialCheck - Whether this is the initial check on page load
     * @returns {Promise<boolean>} - Promise resolving to whether the user is authenticated
     */
    async checkSession(isInitialCheck = false) {
        try {
            const response = await fetch(this.options.sessionEndpoint, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    Pragma: 'no-cache',
                    Expires: '0',
                },
                credentials: 'same-origin',
            });

            const data = await response.json();

            if (data.success && data.authenticated) {
                this.sessionData = data;
                this.lastActivity = Date.now();
                return true;
            } else {
                // Session expired or invalid
                this.isAuthenticated = false;
                this.handleTimeout();
                return false;
            }
        } catch (error) {
            console.error('Session check error:', error);
            if (!isInitialCheck) {
                // Only handle timeout for non-initial checks
                this.handleTimeout();
            }
            return false;
        }
    }

    /**
     * Show session expiration warning
     */
    showWarning(timeLeft) {
        // Element IDs
        const ELEMENT_ID = {
            SESSION_WARNING: 'session-warning',
            SESSION_COUNTDOWN: 'session-countdown',
            SESSION_CONTINUE: 'session-continue',
        };

        // CSS Classes
        const CLASS = {
            SESSION_WARNING_CONTENT: 'session-warning-content',
        };

        // Text Content
        const TEXT = {
            SESSION_EXPIRING: 'Your session is about to expire',
            LOGOUT_WARNING:
                'You will be logged out in <span id="session-countdown">{timeLeft}</span> seconds due to inactivity.',
            CONTINUE_SESSION: 'Continue Session',
        };

        // If custom warning handler provided, use it
        if (typeof this.options.onWarning === 'function') {
            this.options.onWarning(timeLeft);
            this.warningShown = true;
            return;
        }

        // Remove existing warning if present
        this.hideWarning();

        // Create warning element
        const warningElement = document.createElement('div');
        warningElement.id = ELEMENT_ID.SESSION_WARNING;
        warningElement.className = 'session-warning-container';

        // Create warning content
        const warningContent = document.createElement('div');
        warningContent.className =
            CLASS.SESSION_WARNING_CONTENT + ' session-warning-content';

        // Set HTML content
        warningContent.innerHTML = `
            <h3>${TEXT.SESSION_EXPIRING}</h3>
            <p>${TEXT.LOGOUT_WARNING.replace('{timeLeft}', timeLeft)}</p>
            <button id="${
                ELEMENT_ID.SESSION_CONTINUE
            }" class="session-continue-btn">
                ${TEXT.CONTINUE_SESSION}
            </button>
        `;

        // Add to DOM
        warningElement.appendChild(warningContent);
        document.body.appendChild(warningElement);

        // Add event listener to continue button
        document
            .getElementById(ELEMENT_ID.SESSION_CONTINUE)
            .addEventListener('click', () => {
                this.trackActivity();
            });

        // Set countdown timer
        let remaining = timeLeft;
        const countdownElement = document.getElementById(
            ELEMENT_ID.SESSION_COUNTDOWN
        );

        const countdownInterval = setInterval(() => {
            remaining--;
            if (countdownElement) {
                countdownElement.textContent = remaining;
            }

            if (remaining <= 0) {
                clearInterval(countdownInterval);
                this.handleTimeout();
            }
        }, 1000);

        // Set flag
        this.warningShown = true;
    }

    /**
     * Hide session warning
     */
    hideWarning() {
        // Element IDs
        const ELEMENT_ID = {
            SESSION_WARNING: 'session-warning',
        };

        const warningElement = document.getElementById(
            ELEMENT_ID.SESSION_WARNING
        );
        if (warningElement) {
            warningElement.remove();
        }

        this.warningShown = false;
    }

    /**
     * Handle session timeout
     */
    async handleTimeout() {
        // Clear all timers
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }

        // Clear localStorage
        this.clearStoredCredentials();

        // If custom timeout handler provided, use it
        if (typeof this.options.onTimeout === 'function') {
            this.options.onTimeout();
        } else {
            // Call the session killer endpoint
            try {
                // First try the dedicated session killer
                await fetch(API_ENDPOINTS.KILL_SESSION, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        Pragma: 'no-cache',
                        Expires: '0',
                    },
                    credentials: 'same-origin',
                });
            } catch (error) {
                this.log('Error during session kill:', error);

                // Fallback to regular logout if session kill fails
                try {
                    await fetch(API_ENDPOINTS.LOGOUT, {
                        method: 'POST',
                        credentials: 'same-origin',
                    });
                } catch (error) {
                    console.error('Error killing session:', error);
                }
            }

            // Redirect to login page
            this.redirectToLogin();
        }
    }

    /**
     * Clear stored credentials from localStorage and sessionStorage
     */
    clearStoredCredentials() {
        // Remove all items typically used for authentication
        localStorage.removeItem('user');
        localStorage.removeItem('account');
        localStorage.removeItem('token');
        localStorage.removeItem('auth');

        // Clear session storage as well
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('account');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('auth');
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        // Create a unique URL to prevent browser caching
        const cacheBuster = new Date().getTime();
        const redirectUrl = `${this.options.loginPage}?expired=true&t=${cacheBuster}`;

        // Replace current history entry to prevent back navigation
        if (window.location.href !== redirectUrl) {
            window.location.replace(redirectUrl);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // User Activity Events
        const ACTIVITY_EVENTS = [
            'mousemove',
            'mousedown',
            'keypress',
            'scroll',
            'touchstart',
            'click',
        ];

        // Clear timers
        if (this.timer) {
            clearInterval(this.timer);
        }

        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
        }

        // Remove event listeners
        ACTIVITY_EVENTS.forEach((event) => {
            document.removeEventListener(event, this.trackActivity);
        });

        document.removeEventListener('visibilitychange', this.trackActivity);
        window.removeEventListener('pagehide', this.handlePageHide);
        window.removeEventListener('pageshow', this.handlePageShow);
        window.removeEventListener('popstate', this.checkSession);

        // Hide warning if shown
        this.hideWarning();
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.options.debug) {
            console.log('[SessionManager]', ...args);
        }
    }
}

// Export the session manager
if (typeof module !== 'undefined') {
    module.exports = SessionManager;
} else {
    window.SessionManager = SessionManager;
}

// Initialize session manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on authenticated pages
    if (document.body.classList.contains('authenticated-page')) {
        window.sessionManager = new SessionManager({ debug: true });
    }
});

// Add login page redirect handling
if (
    window.location.href.includes('login_account_holder.html') &&
    window.location.search.includes('expired=true')
) {
    document.addEventListener('DOMContentLoaded', () => {
        // Display session expired message if applicable
        const messageContainer = document.createElement('div');
        messageContainer.className = 'notification notification-error';
        messageContainer.innerHTML =
            '<i class="fas fa-exclamation-circle"></i><span>Your session has expired. Please log in again.</span>';
        document.body.appendChild(messageContainer);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageContainer.style.opacity = '0';
            setTimeout(() => messageContainer.remove(), 300);
        }, 5000);
    });
}

// Inactivity session killer logic
let inactivityTimeout;
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in ms

function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(killSession, INACTIVITY_LIMIT);
}

function killSession() {
    let loginUrl =
        window.ROUTES && window.ROUTES.LOGIN ? window.ROUTES.LOGIN : null;
    console.log(
        'killSession: ROUTES.LOGIN =',
        window.ROUTES && window.ROUTES.LOGIN,
        'loginUrl =',
        loginUrl
    );
    if (loginUrl) {
        if (
            window.API_ENDPOINTS &&
            window.API_ENDPOINTS.AUTH &&
            window.API_ENDPOINTS.AUTH.KILL_SESSION
        ) {
            fetch(window.API_ENDPOINTS.AUTH.KILL_SESSION, {
                method: 'POST',
                credentials: 'include',
            }).then(() => {
                window.location.href = loginUrl + '?expired=true';
            });
        } else {
            window.location.href = loginUrl + '?expired=true';
        }
    } else {
        alert(
            'ROUTES.LOGIN is not defined! Please check config.js loading order.'
        );
    }
}

['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(
    (event) => {
        window.addEventListener(event, resetInactivityTimer, true);
    }
);
window.addEventListener('load', resetInactivityTimer);
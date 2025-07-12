// Configuration for API endpoints
class Config {
    constructor() {
        this.apiBaseUrl = this.getApiBaseUrl();
    }

    getApiBaseUrl() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Check if we're on localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Local development - use the full path
            return `${protocol}//${hostname}/project-errawrs/src/api`;
        } else if (hostname === 'admin.stackovercash.site') {
            // Admin domain - use the /api/ route as configured in nginx
            return `${protocol}//${hostname}/api`;
        } else {
            // Other production domains - use the /api/ route
            return `${protocol}//${hostname}/api`;
        }
    }

    // Get full API URL for a specific endpoint
    getApiUrl(endpoint) {
        // Remove leading slash if present
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.apiBaseUrl}/${cleanEndpoint}`;
    }
}

// Create global config instance
window.APP_CONFIG = new Config(); 
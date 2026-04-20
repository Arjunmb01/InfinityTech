/**
 * JWT Token Management - Client-Side Implementation
 * 
 * This file provides examples for handling JWT authentication on the frontend
 * including automatic token refresh and error handling.
 */

// ============================================================================
// VANILLA JAVASCRIPT IMPLEMENTATION
// ============================================================================

/**
 * Fetch with automatic token refresh
 */
async function fetchWithAuth(url, options = {}) {
    try {
        // Make the initial request
        let response = await fetch(url, {
            ...options,
            credentials: 'include' // Important: send cookies
        });

        // If token expired, try to refresh
        if (response.status === 401) {
            const data = await response.json();
            
            if (data.tokenExpired) {
                // Try to refresh the token
                const refreshResponse = await fetch('/api/auth/refresh-token', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (refreshResponse.ok) {
                    // Retry the original request
                    response = await fetch(url, {
                        ...options,
                        credentials: 'include'
                    });
                } else {
                    // Refresh failed, redirect to login
                    window.location.href = '/login';
                    throw new Error('Session expired');
                }
            }
        }

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

/**
 * Example usage of fetchWithAuth
 */
async function getUserProfile() {
    try {
        const response = await fetchWithAuth('/api/user/profile');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to get profile:', error);
    }
}

// ============================================================================
// AXIOS IMPLEMENTATION
// ============================================================================

/**
 * Setup Axios interceptor for automatic token refresh
 * Add this code in your main.js or app initialization
 */
function setupAxiosInterceptor() {
    // Request interceptor - ensure credentials are sent
    axios.interceptors.request.use(
        config => {
            config.withCredentials = true;
            return config;
        },
        error => {
            return Promise.reject(error);
        }
    );

    // Response interceptor - handle token refresh
    axios.interceptors.response.use(
        response => response,
        async error => {
            const originalRequest = error.config;

            // Check if error is 401 and token is expired
            if (
                error.response?.status === 401 && 
                error.response?.data?.tokenExpired && 
                !originalRequest._retry
            ) {
                originalRequest._retry = true;

                try {
                    // Try to refresh the token
                    await axios.post('/api/auth/refresh-token', {}, {
                        withCredentials: true
                    });

                    // Retry the original request
                    return axios(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, redirect to login
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }

            // Check if user needs to login
            if (error.response?.data?.requiresLogin) {
                window.location.href = '/login';
            }

            return Promise.reject(error);
        }
    );
}

// Initialize the interceptor
// setupAxiosInterceptor();

// ============================================================================
// JQUERY/AJAX IMPLEMENTATION
// ============================================================================

/**
 * jQuery AJAX with token refresh
 */
function ajaxWithAuth(settings) {
    settings.xhrFields = settings.xhrFields || {};
    settings.xhrFields.withCredentials = true;

    return $.ajax(settings)
        .fail(function(xhr) {
            if (xhr.status === 401 && xhr.responseJSON?.tokenExpired) {
                // Token expired, try to refresh
                $.ajax({
                    url: '/api/auth/refresh-token',
                    method: 'POST',
                    xhrFields: { withCredentials: true }
                })
                .done(function() {
                    // Retry original request
                    $.ajax(settings);
                })
                .fail(function() {
                    // Refresh failed, redirect to login
                    window.location.href = '/login';
                });
            } else if (xhr.responseJSON?.requiresLogin) {
                window.location.href = '/login';
            }
        });
}

/**
 * Example jQuery usage
 */
function loadUserData() {
    ajaxWithAuth({
        url: '/api/user/profile',
        method: 'GET',
        success: function(data) {
            console.log('User data:', data);
        },
        error: function(xhr) {
            console.error('Error:', xhr.responseText);
        }
    });
}

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/verify', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.user; // Returns user object if authenticated
        }
        
        return null;
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

/**
 * Run on page load to check authentication status
 */
async function initializeAuth() {
    const user = await checkAuth();
    
    if (user) {
        console.log('User is authenticated:', user);
        // Update UI with user info
        updateUIForAuthenticatedUser(user);
    } else {
        console.log('User is not authenticated');
        // Show login button, etc.
        updateUIForGuest();
    }
}

// ============================================================================
// LOGOUT FUNCTIONALITY
// ============================================================================

/**
 * Logout from current device only
 */
async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

/**
 * Logout from all devices
 */
async function logoutAllDevices() {
    try {
        const response = await fetch('/api/auth/revoke-all-tokens', {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Logged out from all devices');
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout all devices failed:', error);
    }
}

// ============================================================================
// UI UPDATE HELPERS
// ============================================================================

function updateUIForAuthenticatedUser(user) {
    // Update navbar with user info
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = user.name;
    }
    
    // Show logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = 'block';
    }
    
    // Hide login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.display = 'none';
    }
}

function updateUIForGuest() {
    // Hide logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = 'none';
    }
    
    // Show login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.display = 'block';
    }
}

// ============================================================================
// TOKEN REFRESH BACKGROUND SERVICE (OPTIONAL)
// ============================================================================

/**
 * Automatically refresh token before it expires
 * Call this on app initialization for better UX
 */
function startTokenRefreshService() {
    // Refresh token every 14 minutes (access token expires in 15 minutes)
    const refreshInterval = 14 * 60 * 1000; // 14 minutes
    
    setInterval(async () => {
        try {
            const response = await fetch('/api/auth/refresh-token', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                console.log('Token refreshed automatically');
            }
        } catch (error) {
            console.error('Auto refresh failed:', error);
        }
    }, refreshInterval);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    initializeAuth();
    
    // Optional: Start background token refresh
    // startTokenRefreshService();
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Setup logout all devices button
    const logoutAllBtn = document.getElementById('logoutAllBtn');
    if (logoutAllBtn) {
        logoutAllBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout from all devices?')) {
                logoutAllDevices();
            }
        });
    }
});

// ============================================================================
// EXPORT FOR MODULE SYSTEMS
// ============================================================================

// If using ES6 modules
export {
    fetchWithAuth,
    checkAuth,
    logout,
    logoutAllDevices,
    setupAxiosInterceptor,
    startTokenRefreshService
};

// If using CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchWithAuth,
        checkAuth,
        logout,
        logoutAllDevices,
        setupAxiosInterceptor,
        startTokenRefreshService
    };
}

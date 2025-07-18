import axios from 'axios';

// Determine the API URL based on environment
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
console.log(`Initializing auth service with API URL: ${API_URL}`);

// Helper function to log API requests
const logRequest = (config) => {
  console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
    data: config.data,
    params: config.params,
    headers: config.headers,
    withCredentials: config.withCredentials
  });
  return config;
};

// Helper function to log API responses
const logResponse = (response) => {
  console.log(`[API Response] ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`, {
    data: response.data,
    headers: response.headers
  });
  return response;
};

// Helper function to log API errors
const logError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    console.error(`[API Error] ${error.response.status} ${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.url || 'unknown-url'}`, {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        params: error.config?.params,
        data: error.config?.data,
        headers: error.config?.headers
      }
    });
  } else if (error.request) {
    // The request was made but no response was received
    console.error('[API Error] No response received', {
      request: error.request,
      message: error.message
    });
  } else {
    // Something happened in setting up the request
    console.error('[API Error] Request setup error', {
      message: error.message,
      stack: error.stack
    });
  }
  return Promise.reject(error);
};

// Initialize axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // This is important for sending cookies with requests
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  logRequest,
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging and error handling
api.interceptors.response.use(
  logResponse,
  error => {
    logError(error);
    
    // Handle specific error statuses
    if (error.response) {
      switch (error.response.status) {
        case 401: // Unauthorized
          console.log('Session expired or not authenticated, redirecting to login');
          // Only redirect if not already on login page to prevent redirect loops
          if (!window.location.pathname.includes('/login')) {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }
          break;
        case 403: // Forbidden
          console.error('Access denied - insufficient permissions');
          break;
        case 404: // Not Found
          console.error('Requested resource not found');
          break;
        case 500: // Internal Server Error
          console.error('Server error occurred');
          break;
        default:
          console.error('Unhandled API error status:', error.response.status);
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server is not responding');
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error - please check your internet connection');
    }
    
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  // Initiate login with Fitbit
  login: async () => {
    try {
      console.log('Initiating Fitbit OAuth flow...');
      
      // Clear any existing session data
      localStorage.removeItem('authState');
      
      console.log('Making API call to /fitbit/auth-url...');
      
      // Get the authorization URL from the backend
      const response = await api.get('/fitbit/auth-url');
      
      console.log('API response received:', response);
      
      if (!response.data?.url) {
        console.error('No URL in response:', response.data);
        throw new Error('No authorization URL received from server');
      }
      
      const authUrl = response.data.url;
      console.log('Authorization URL:', authUrl);
      
      // Store the current URL to redirect back after successful login
      const redirectAfterLogin = window.location.pathname !== '/login' 
        ? window.location.pathname + window.location.search 
        : '/dashboard';
      
      // Store the redirect URL in session storage (not local storage for security)
      sessionStorage.setItem('redirectAfterLogin', redirectAfterLogin);
      
      console.log('About to redirect to:', authUrl);
      
      // Redirect to Fitbit authorization page
      window.location.href = authUrl;
      
      console.log('Redirect initiated');
      
      // Return a promise that will only resolve after the redirect
      return new Promise(() => {});
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(error.response?.data?.message || 'Failed to initiate login');
    }
  },

  // Logout user
  logout: async () => {
    try {
      console.log('Initiating logout...');
      await api.post('/auth/logout');
      
      // Clear local storage and session storage
      localStorage.removeItem('authState');
      sessionStorage.clear();
      
      // Clear any cookies by setting their expiration to the past
      document.cookie.split(';').forEach(c => {
        document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
      });
      
      console.log('Logout successful, redirecting to login page...');
      
      // Redirect to login page
      window.location.href = '/login';
      
      // Return a promise that will only resolve after the redirect
      return new Promise(() => {});
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, we still want to clear the local state
      localStorage.removeItem('authState');
      sessionStorage.clear();
      window.location.href = '/login';
      return new Promise(() => {});
    }
  },

  // Get current session
  getSession: async () => {
    try {
      console.log('Fetching session data...');
      const response = await api.get('/auth/session');
      
      // Cache the session data in localStorage for quick access
      if (response.data.isAuthenticated) {
        localStorage.setItem('authState', JSON.stringify({
          isAuthenticated: true,
          user: response.data.user,
          timestamp: Date.now()
        }));
      } else {
        localStorage.removeItem('authState');
      }
      
      console.log('Session data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Session error:', error);
      // If there's an error, clear any cached auth state
      localStorage.removeItem('authState');
      
      // Return a default response instead of throwing
      return { isAuthenticated: false };
    }
  },
  
  // Check if user is authenticated (synchronous check)
  isAuthenticated: () => {
    try {
      const authState = localStorage.getItem('authState');
      if (!authState) return false;
      
      const { isAuthenticated, timestamp } = JSON.parse(authState);
      
      // Consider the session valid for up to 5 minutes without checking with the server
      if (isAuthenticated && (Date.now() - timestamp) < (5 * 60 * 1000)) {
        return true;
      }
      
      // If the cached state is too old, return false to force a server check
      return false;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  },
  
  // Get the stored redirect URL and clear it
  getAndClearRedirectUrl: () => {
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
    sessionStorage.removeItem('redirectAfterLogin');
    return redirectUrl;
  }
};

export default api;
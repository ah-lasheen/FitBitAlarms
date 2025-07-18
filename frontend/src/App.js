import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { authService } from './services/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import './App.css';

// Component to handle OAuth callback and redirects
const AuthHandler = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthHandler: Starting authentication check...');
    const handleOAuthCallback = async () => {
      try {
        // Check for OAuth callback with code
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');
        const auth = params.get('auth');
        
        console.log('AuthHandler: URL params - code:', !!code, 'error:', error, 'auth:', auth);
        
        if (error) {
          console.error('OAuth error:', error);
          message.error('Authentication failed. Please try again.');
          navigate('/login');
          return;
        }
        
        // Check for OAuth success callback
        if (auth === 'success') {
          console.log('OAuth success detected, redirecting to dashboard...');
          // Clear the URL parameters
          window.history.replaceState({}, document.title, '/dashboard');
          navigate('/dashboard');
          return;
        }
        
        // If this is an OAuth callback with code, the backend will handle it
        if (code) {
          console.log('OAuth callback detected, waiting for session...');
          // The backend will set the session cookie and redirect to /dashboard
          return;
        }
        
        // Check if we have a valid session
        console.log('AuthHandler: Checking session...');
        try {
          const { isAuthenticated } = await authService.getSession();
          console.log('AuthHandler: Session result - isAuthenticated:', isAuthenticated);
          
          // Handle redirects based on authentication status
          if (location.pathname === '/login' && isAuthenticated) {
            const redirectUrl = authService.getAndClearRedirectUrl();
            console.log('Redirecting to:', redirectUrl);
            navigate(redirectUrl);
          } else if (location.pathname !== '/login' && !isAuthenticated) {
            console.log('Not authenticated, redirecting to login');
            navigate('/login');
          }
        } catch (error) {
          console.error('AuthHandler: Session check failed:', error);
          // If session check fails, assume not authenticated
          if (location.pathname !== '/login') {
            console.log('Session check failed, redirecting to login');
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth handler error:', error);
        message.error('An error occurred while checking authentication status');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    handleOAuthCallback();
  }, [location, navigate]);
  
  if (isLoading) {
    console.log('AuthHandler: Showing loading spinner...');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: '#ffffff'
      }}>
        <Spin size="large" tip="Checking authentication..." />
      </div>
    );
  }
  
  console.log('AuthHandler: Rendering children...');
  return children;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  console.log('App: Rendering with isAuthenticated:', isAuthenticated, 'isInitialized:', isInitialized);

  // Check authentication status on app load
  useEffect(() => {
    console.log('App: Starting authentication check...');
    const checkAuth = async () => {
      try {
        console.log('Checking authentication status...');
        const { isAuthenticated: isAuth } = await authService.getSession();
        console.log('Authentication status:', isAuth);
        setIsAuthenticated(isAuth);
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsInitialized(true);
      }
    };

    checkAuth();
  }, []);

  // Show loading spinner while initializing
  if (!isInitialized) {
    console.log('App: Showing initialization spinner...');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: '#ffffff'
      }}>
        <Spin size="large" tip="Initializing application..." />
      </div>
    );
  }

  console.log('App: Rendering routes with isAuthenticated:', isAuthenticated);
  return (
    <AuthHandler>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to={authService.getAndClearRedirectUrl()} replace />
            ) : (
              <Login />
            )
          } 
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          }
        />
        {/* Add a catch-all route for 404s */}
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          }
        />
      </Routes>
    </AuthHandler>
  );
};

export default App;

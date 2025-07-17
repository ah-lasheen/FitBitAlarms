import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Spin, message } from 'antd';
import { authService } from './services/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import './App.css';

const { Content } = Layout;

// Component to handle OAuth callback and redirects
const AuthHandler = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Check for OAuth callback with code
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');
        
        if (error) {
          console.error('OAuth error:', error);
          message.error('Authentication failed. Please try again.');
          navigate('/login');
          return;
        }
        
        // If this is an OAuth callback, the backend will handle it
        // We just need to wait for the session to be established
        if (code) {
          console.log('OAuth callback detected, waiting for session...');
          // The backend will set the session cookie and redirect to /dashboard
          return;
        }
        
        // Check if we have a valid session
        const { isAuthenticated } = await authService.getSession();
        
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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Checking authentication..." />
      </div>
    );
  }
  
  return children;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [isInitialized, setIsInitialized] = useState(false);
  const location = useLocation();

  // Check authentication status on app load and when location changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication status...');
        const { isAuthenticated: isAuth } = await authService.getSession();
        console.log('Authentication status:', isAuth);
        setIsAuthenticated(isAuth);
        
        // If user is authenticated and on login page, redirect to dashboard
        if (isAuth && location.pathname === '/login') {
          const redirectUrl = authService.getAndClearRedirectUrl();
          window.location.href = redirectUrl;
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsInitialized(true);
      }
    };

    checkAuth();
  }, [location.pathname]);

  // Show loading spinner while initializing
  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Initializing application..." />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
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
      </Content>
    </Layout>
  );
};

const AppWrapper = () => (
  <Router>
    <AuthHandler>
      <App />
    </AuthHandler>
  </Router>
);

export default AppWrapper;

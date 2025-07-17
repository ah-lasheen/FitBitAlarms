import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { authService } from '../../services/auth';

const ProtectedRoute = ({ children, isAuthenticated, requiredRoles = [] }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(isAuthenticated === null);
  const [authError, setAuthError] = useState(null);

  // Check authentication status if not already known
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isAuthenticated === null) {
          const { isAuthenticated: isAuth } = await authService.getSession();
          setIsLoading(false);
          
          // If not authenticated, redirect to login
          if (!isAuth) {
            const redirectUrl = `${location.pathname}${location.search}`;
            navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
          }
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setAuthError('Failed to verify authentication status');
        setIsLoading(false);
      }
    };

    if (isAuthenticated === null) {
      checkAuth();
    }
  }, [isAuthenticated, location, navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <div>Verifying your session...</div>
      </div>
    );
  }

  // Show error state
  if (authError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        padding: '24px'
      }}>
        <Result
          status="error"
          title="Authentication Error"
          subTitle={authError}
          extra={[
            <Button 
              type="primary" 
              key="retry" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>,
            <Button 
              key="login" 
              onClick={() => {
                authService.logout();
                navigate('/login');
              }}
            >
              Go to Login
            </Button>
          ]}
        />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    const redirectUrl = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  // Check for required roles if specified
  if (requiredRoles.length > 0) {
    // This assumes your user object has a roles array
    // You'll need to adjust this based on your actual user data structure
    const userRoles = []; // Get user roles from your auth context or service
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          padding: '24px'
        }}>
          <Result
            status="403"
            title="403"
            subTitle="Sorry, you are not authorized to access this page."
            extra={
              <Button 
                type="primary" 
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
            }
          />
        </div>
      );
    }
  }

  // User is authenticated and has required role (if any)
  return children;
};

export default ProtectedRoute;

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Typography, Alert, Spin, Divider, message } from 'antd';
import { authService } from '../../services/auth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LockOutlined, InfoCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import styles from './styles.module.css';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for OAuth errors or session status on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for OAuth callback errors
        const errorParam = searchParams.get('error');
        if (errorParam) {
          setError(
            errorParam === 'access_denied' 
              ? 'You cancelled the login process. Please try again if you want to continue.' 
              : 'An error occurred during login. Please try again.'
          );
          // Remove the error parameter from the URL
          const cleanUrl = window.location.pathname + window.location.search.replace(/[&?]error=[^&]+/, '');
          window.history.replaceState({}, document.title, cleanUrl);
        }

        // Check if we have a valid session
        const { isAuthenticated } = await authService.getSession();
        if (isAuthenticated) {
          // If already authenticated, redirect to dashboard or intended URL
          const redirectUrl = searchParams.get('redirect') || '/dashboard';
          navigate(redirectUrl, { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setError('Unable to verify your session. Please try again.');
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkAuthStatus();
  }, [navigate, searchParams]);

  const handleLogin = useCallback(async () => {
    try {
      console.log('Login button clicked');
      setLoading(true);
      setError('');
      
      // Store the current URL for redirecting back after login
      const redirectUrl = searchParams.get('redirect') || window.location.pathname;
      if (redirectUrl && redirectUrl !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', redirectUrl);
      }
      
      console.log('About to call authService.login()...');
      
      // Initiate the login flow directly
      await authService.login();
      
      console.log('Login flow completed');
      
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to start the login process. Please check your internet connection and try again.'
      );
      
      // Show error message to user
      message.error({
        content: 'Failed to connect to Fitbit. Please try again.',
        key: 'login-error',
        duration: 5
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="Checking your session..." />
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      <Card 
        className={styles.loginCard}
        hoverable
      >
        <div className={styles.logoContainer}>
          <img 
            src="/logo.png" 
            alt="Fitbit Dashboard" 
            className={styles.appLogo}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <Title level={2} className={styles.title}>Fitbit Dashboard</Title>
          <Text type="secondary" className={styles.subtitle}>
            Track, analyze, and optimize your fitness journey
          </Text>
        </div>

        {error && (
          <Alert
            message="Login Error"
            description={
              <div>
                <p>{error}</p>
                <p className={styles.errorHelp}>
                  <InfoCircleOutlined /> If the problem persists, try clearing your browser cookies or use a different browser.
                </p>
              </div>
            }
            type="error"
            showIcon
            className={styles.alert}
            closable
            onClose={() => setError('')}
          />
        )}

        <div className={styles.loginButtonContainer}>
          <Button
            type="primary"
            size="large"
            onClick={handleLogin}
            loading={loading}
            icon={
              <img 
                src="/fitbit-logo.png" 
                alt="Fitbit" 
                className={styles.fitbitLogo} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            }
            className={styles.fitbitButton}
            disabled={loading}
          >
            {loading ? 'Connecting to Fitbit...' : 'Sign in with Fitbit'}
          </Button>
          
          <Divider>Or</Divider>
          
          <div className={styles.helpSection}>
            <Alert
              message="Don't have a Fitbit account?"
              description={
                <span>
                  You'll need a Fitbit account to use this app. 
                  <a 
                    href="https://www.fitbit.com/signup" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.signupLink}
                  >
                    Sign up for free <ArrowRightOutlined />
                  </a>
                </span>
              }
              type="info"
              showIcon
              className={styles.infoAlert}
            />
            
            <div className={styles.privacyInfo}>
              <LockOutlined />
              <Text type="secondary" className={styles.privacyText}>
                We'll never store your Fitbit password. Your data is secure and private.
              </Text>
            </div>
          </div>
        </div>
      </Card>
      
      <div className={styles.footer}>
        <Text type="secondary">
          © {new Date().getFullYear()} Fitbit Dashboard. All rights reserved.
        </Text>
        <div className={styles.footerLinks}>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/help">Help Center</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
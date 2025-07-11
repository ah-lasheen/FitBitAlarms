import React, { useState } from 'react';
import { Button, Card, Alert } from 'antd';
import { HeartOutlined } from '@ant-design/icons';

const FitbitConnect = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5001/api/fitbit/auth-url');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get authorization URL');
      }
      
      const data = await response.json();
      if (!data.url) {
        throw new Error('Invalid authorization URL received');
      }
      
      // redirect to Fitbit's authorization page
      window.location.href = data.url;
    } catch (error) {
      console.error('Error connecting to Fitbit:', error);
      setError(error.message || 'Error connecting to Fitbit');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto' }}>
      <Card title="Connect with Fitbit">
        {error && (
          <Alert 
            message="Error" 
            description={error} 
            type="error" 
            showIcon 
            style={{ marginBottom: 16 }} 
          />
        )}
        
        <Button
          type="primary"
          icon={<HeartOutlined />}
          onClick={handleConnect}
          loading={loading}
          size="large"
          block
        >
          Connect with Fitbit
        </Button>
      </Card>
    </div>
  );
};

export default FitbitConnect;

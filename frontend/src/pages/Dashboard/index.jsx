import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin, Row, Col, Statistic } from 'antd';
import { 
  HeartOutlined, 
  FireOutlined, 
  DashboardOutlined, 
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import styles from './styles.module.css';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await authService.getSession();
        if (!data.isAuthenticated) {
          navigate('/login');
          return;
        }
        setUserData(data.user);
        
        // Fetch metrics data
        await fetchMetrics();
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const fetchMetrics = async () => {
    try {
      // Import the API instance from auth service
      const api = (await import('../../services/auth')).default;
      
      const response = await api.get('/fitbit/metrics');
      console.log('Metrics response:', response.data);
      console.log('Activity data:', JSON.stringify(response.data.activity, null, 2));
      console.log('Heart rate data:', JSON.stringify(response.data.heartRate, null, 2));
      console.log('Sleep data:', JSON.stringify(response.data.sleep, null, 2));
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
  };

  const renderCircularGauge = (value, maxValue, title, color = '#52c41a', unit = '') => {
    const percentage = Math.min((value / maxValue) * 100, 100);
    const strokeDasharray = `${percentage}, 100`;
    
    return (
      <div className={styles.gaugeContainer}>
        <div className={styles.gauge}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className={styles.gaugeValue}>
            <span className={styles.gaugeNumber}>{value.toLocaleString()}</span>
            {unit && <span className={styles.gaugeUnit}>{unit}</span>}
          </div>
        </div>
        <Text className={styles.gaugeTitle}>{title}</Text>
      </div>
    );
  };

  const renderHeartRateGauge = () => {
    // Check multiple possible paths for resting heart rate
    let rhr = metrics?.heartRate?.['activities-heart']?.[0]?.value?.restingHeartRate ||
              metrics?.heartRate?.activitiesHeart?.[0]?.value?.restingHeartRate ||
              metrics?.heartRate?.summary?.restingHeartRate;
    
    // If no resting heart rate, try to estimate from heart rate zones
    if (!rhr) {
      const heartRateZones = metrics?.heartRate?.['activities-heart']?.[0]?.value?.heartRateZones;
      if (heartRateZones && heartRateZones.length > 0) {
        // Use the "Out of Range" zone minimum as an estimate
        const outOfRangeZone = heartRateZones.find(zone => zone.name === 'Out of Range');
        if (outOfRangeZone) {
          rhr = outOfRangeZone.min;
        }
      }
    }
    
    if (!rhr) {
      return renderCircularGauge(0, 100, 'Resting Heart Rate', '#f5222d', 'bpm');
    }
    
    return renderCircularGauge(rhr, 100, 'Resting Heart Rate', '#f5222d', 'bpm');
  };

  const renderStepsGauge = () => {
    if (!metrics?.activity?.summary?.steps) {
      return renderCircularGauge(0, 10000, 'Today\'s Steps', '#52c41a', 'steps');
    }
    
    const steps = metrics.activity.summary.steps;
    return renderCircularGauge(steps, 10000, 'Today\'s Steps', '#52c41a', 'steps');
  };

  const renderCaloriesGauge = () => {
    if (!metrics?.activity?.summary?.caloriesOut) {
      return renderCircularGauge(0, 3000, 'Calories Burned', '#fa8c16', 'kcal');
    }
    
    const calories = metrics.activity.summary.caloriesOut;
    return renderCircularGauge(calories, 3000, 'Calories Burned', '#fa8c16', 'kcal');
  };

  const renderActiveMinutesGauge = () => {
    // Calculate total active minutes from all activity levels
    const summary = metrics?.activity?.summary;
    if (!summary) {
      return renderCircularGauge(0, 60, 'Active Minutes', '#1890ff', 'min');
    }
    
    const totalActiveMinutes = (summary.lightlyActiveMinutes || 0) + 
                              (summary.fairlyActiveMinutes || 0) + 
                              (summary.veryActiveMinutes || 0);
    
    return renderCircularGauge(totalActiveMinutes, 60, 'Active Minutes', '#1890ff', 'min');
  };

  const renderHeartRateChart = () => {
    // Check multiple possible paths for heart rate data
    const heartRateData = metrics?.heartRate?.['activities-heart-intraday']?.dataset ||
                          metrics?.heartRate?.activitiesHeartIntraday?.dataset ||
                          metrics?.heartRate?.intraday?.dataset ||
                          metrics?.heartRate?.['activities-heart']?.[0]?.value?.heartRateZones;
    
    if (!heartRateData) {
      return (
        <div className={styles.chartPlaceholder}>
          <Text type="secondary">No heart rate data available</Text>
        </div>
      );
    }
    
    // If we have heart rate zones but no intraday data, show a zone-based chart
    if (Array.isArray(heartRateData) && heartRateData[0]?.name) {
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <Title level={4} className={styles.chartTitle}>Heart Rate Zones</Title>
            <Text className={styles.chartSubtitle}>Today's activity</Text>
          </div>
          
          <div className={styles.heartRateZonesChart}>
            {heartRateData.map((zone, index) => (
              <div key={index} className={styles.zoneBar}>
                <div 
                  className={styles.zoneSegment}
                  style={{
                    height: `${(zone.minutes / 60) * 100}%`,
                    backgroundColor: 
                      zone.name === 'Out of Range' ? '#d9d9d9' :
                      zone.name === 'Fat Burn' ? '#52c41a' :
                      zone.name === 'Cardio' ? '#fa8c16' :
                      zone.name === 'Peak' ? '#f5222d' : '#1890ff'
                  }}
                  title={`${zone.name}: ${zone.minutes} minutes`}
                />
                <Text className={styles.zoneLabel}>{zone.name}</Text>
              </div>
            ))}
          </div>
        </div>
      );
    }
    const maxHR = Math.max(...heartRateData.map(d => d.value));
    const minHR = Math.min(...heartRateData.map(d => d.value));
    const avgHR = Math.round(heartRateData.reduce((sum, d) => sum + d.value, 0) / heartRateData.length);

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <Title level={4} className={styles.chartTitle}>Heart Rate</Title>
          <Text className={styles.chartSubtitle}>Last 24 hours</Text>
        </div>
        
        <div className={styles.heartRateChart}>
          {heartRateData.map((point, index) => {
            const height = (point.value / 150) * 100; // Normalize to 150 bpm max
            return (
              <div
                key={index}
                className={styles.heartRateBar}
                style={{
                  height: `${height}%`,
                  backgroundColor: point.value > 95 ? '#f5222d' : '#faad14'
                }}
                title={`${point.time}: ${point.value} bpm`}
              />
            );
          })}
        </div>
        
        <div className={styles.chartStats}>
          <div className={styles.statItem}>
            <Text className={styles.statLabel}>Min</Text>
            <Text className={styles.statValue}>{minHR}</Text>
          </div>
          <div className={styles.statItem}>
            <Text className={styles.statLabel}>Max</Text>
            <Text className={styles.statValue}>{maxHR}</Text>
          </div>
          <div className={styles.statItem}>
            <Text className={styles.statLabel}>Avg</Text>
            <Text className={styles.statValue}>{avgHR}</Text>
          </div>
        </div>
      </div>
    );
  };

  const renderSleepChart = () => {
    // Check multiple possible paths for sleep data
    const sleepData = metrics?.sleep?.sleep?.[0] ||
                      metrics?.sleep?.summary?.sleep?.[0] ||
                      metrics?.sleep?.data?.[0];
    
    if (!sleepData) {
      return (
        <div className={styles.chartPlaceholder}>
          <Text type="secondary">No sleep data available</Text>
        </div>
      );
    }
    const levels = sleepData.levels?.data || [];
    
    // Calculate sleep stage percentages
    const totalTime = levels.reduce((sum, level) => sum + level.seconds, 0);
    const stageStats = {
      awake: levels.filter(l => l.level === 'wake').reduce((sum, l) => sum + l.seconds, 0),
      light: levels.filter(l => l.level === 'light').reduce((sum, l) => sum + l.seconds, 0),
      deep: levels.filter(l => l.level === 'deep').reduce((sum, l) => sum + l.seconds, 0),
      rem: levels.filter(l => l.level === 'rem').reduce((sum, l) => sum + l.seconds, 0)
    };

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <Title level={4} className={styles.chartTitle}>Sleep Pattern</Title>
          <Text className={styles.chartSubtitle}>Last night</Text>
        </div>
        
        <div className={styles.sleepChart}>
          {levels.map((level, index) => (
            <div
              key={index}
              className={styles.sleepSegment}
              style={{
                width: `${(level.seconds / totalTime) * 100}%`,
                backgroundColor: 
                  level.level === 'wake' ? '#f5222d' :
                  level.level === 'light' ? '#1890ff' :
                  level.level === 'deep' ? '#722ed1' :
                  level.level === 'rem' ? '#13c2c2' : '#d9d9d9'
              }}
              title={`${level.level}: ${Math.round(level.seconds / 60)} minutes`}
            />
          ))}
        </div>
        
        <div className={styles.sleepLegend}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#f5222d' }}></div>
            <Text className={styles.legendText}>Awake ({Math.round((stageStats.awake / totalTime) * 100)}%)</Text>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#1890ff' }}></div>
            <Text className={styles.legendText}>Light ({Math.round((stageStats.light / totalTime) * 100)}%)</Text>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#722ed1' }}></div>
            <Text className={styles.legendText}>Deep ({Math.round((stageStats.deep / totalTime) * 100)}%)</Text>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#13c2c2' }}></div>
            <Text className={styles.legendText}>REM ({Math.round((stageStats.rem / totalTime) * 100)}%)</Text>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Title level={2} className={styles.headerTitle}>
              <DashboardOutlined /> Health Stats
            </Title>
            <Text className={styles.headerSubtitle}>
              Welcome back, {userData?.displayName || 'User'}
            </Text>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.userInfo}>
              <UserOutlined className={styles.userIcon} />
              <Text className={styles.userName}>{userData?.displayName || 'User'}</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <Row gutter={[24, 24]}>
          {/* Left Column - Gauges */}
          <Col xs={24} lg={8}>
            <div className={styles.gaugesSection}>
              <Title level={3} className={styles.sectionTitle}>Today's Summary</Title>
              
              <div className={styles.gaugesGrid}>
                {renderStepsGauge()}
                {renderCaloriesGauge()}
                {renderActiveMinutesGauge()}
                {renderHeartRateGauge()}
              </div>
            </div>
          </Col>

          {/* Right Column - Charts */}
          <Col xs={24} lg={16}>
            <div className={styles.chartsSection}>
              <Title level={3} className={styles.sectionTitle}>Activity Details</Title>
              
              <div className={styles.chartsGrid}>
                <Card className={styles.chartCard}>
                  {renderHeartRateChart()}
                </Card>
                
                <Card className={styles.chartCard}>
                  {renderSleepChart()}
                </Card>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
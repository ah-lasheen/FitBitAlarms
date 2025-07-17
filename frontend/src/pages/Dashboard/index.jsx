import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Spin, Select, Space } from 'antd';
import { 
  FireOutlined, 
  HeartOutlined, 
  DashboardOutlined, 
  TrophyOutlined,
  LineChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import styles from './styles.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  // Mock data - replace with actual API calls
  const [stats, setStats] = useState({
    steps: 8543,
    calories: 2345,
    activeMinutes: 45,
    heartRate: 72,
    distance: 6.2,
    sleep: 7.5,
  });

  const [trends, setTrends] = useState({
    steps: { value: 12, direction: 'up' },
    calories: { value: 8, direction: 'up' },
    activeMinutes: { value: 5, direction: 'down' },
    heartRate: { value: 3, direction: 'down' },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await authService.getSession();
        if (!data.isAuthenticated) {
          navigate('/login');
          return;
        }
        setUserData(data.user);
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    // Here you would typically refetch data based on the selected time range
  };

  const renderTrendIndicator = (trend) => {
    const TrendIcon = trend.direction === 'up' ? ArrowUpOutlined : ArrowDownOutlined;
    const trendClass = trend.direction === 'up' ? styles.trendUp : styles.trendDown;
    
    return (
      <span className={`${styles.trend} ${trendClass}`}>
        <TrendIcon /> {trend.value}%
      </span>
    );
  };

  const statCards = [
    {
      title: 'Steps',
      value: stats.steps.toLocaleString(),
      icon: <DashboardOutlined />,
      color: '#1890ff',
      suffix: 'steps',
      trend: trends.steps
    },
    {
      title: 'Calories',
      value: stats.calories.toLocaleString(),
      icon: <FireOutlined />,
      color: '#fa8c16',
      suffix: 'kcal',
      trend: trends.calories
    },
    {
      title: 'Active Minutes',
      value: stats.activeMinutes,
      icon: <ClockCircleOutlined />,
      color: '#52c41a',
      suffix: 'min',
      trend: trends.activeMinutes
    },
    {
      title: 'Heart Rate',
      value: stats.heartRate,
      icon: <HeartOutlined />,
      color: '#f5222d',
      suffix: 'bpm',
      trend: trends.heartRate
    },
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} className={styles.title}>
              Activity Dashboard
            </Title>
            <Text type="secondary">
              Welcome back, {userData?.displayName || 'User'}! Here's your {timeRange === 'today' ? 'daily' : timeRange} summary.
            </Text>
          </div>
          <Select
            value={timeRange}
            onChange={handleTimeRangeChange}
            style={{ width: 150 }}
            suffixIcon={<CalendarOutlined />}
          >
            <Option value="today">Today</Option>
            <Option value="week">This Week</Option>
            <Option value="month">This Month</Option>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card className={styles.statCard} hoverable>
              <div className={styles.statContent}>
                <div 
                  className={styles.statIconContainer}
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  {React.cloneElement(stat.icon, { 
                    style: { ...stat.icon.props.style, color: stat.color, fontSize: 24 } 
                  })}
                </div>
                <div className={styles.statText}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">{stat.title}</Text>
                    {stat.trend && renderTrendIndicator(stat.trend)}
                  </div>
                  <Title level={3} className={styles.statValue}>
                    {stat.value}
                    {stat.suffix && <span className={styles.statSuffix}> {stat.suffix}</span>}
                  </Title>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} className={styles.chartsRow}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <LineChartOutlined />
                <span>Activity Overview</span>
              </Space>
            } 
            className={styles.chartCard}
          >
            <div className={styles.chartPlaceholder}>
              <Text type="secondary">Activity chart will be displayed here</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <TrophyOutlined />
                <span>Daily Goals</span>
              </Space>
            } 
            className={styles.chartCard}
          >
            <div className={styles.goalsPlaceholder}>
              <Text type="secondary">Goals progress will be shown here</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
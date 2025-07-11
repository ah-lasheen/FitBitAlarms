import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import FitbitConnect from './components/FitbitConnect';
import './App.css';

const { Content } = Layout;

function App() {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '24px' }}>
          <Routes>
            <Route path="/" element={<FitbitConnect />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}

export default App;

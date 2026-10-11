// src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './context/AuthContext';
import LoginPage from './Components/LoginPage';
import SignupPage from './Components/SignupPage';
import ForgotPasswordPage from './Components/ForgotPasswordPage';
import TopLoadingBar from 'react-top-loading-bar';
import DashboardApp from './DatabaseApp';
import UserProfile from './Components/Userprofile';

function App() {
  const [progress, setProgress] = useState(0);
  const { isAuthenticated, loading } = useAuth();

  const handleButtonClick = () => {
    setProgress(30);
    setTimeout(() => setProgress(100), 1000);
  };

  useEffect(() => {
    setProgress(100);
    setTimeout(() => {
      setProgress(0);
    }, 2000);
  }, []);

  // Show a loading spinner or null while checking for authentication
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <TopLoadingBar
        progress={progress}
        color="#ffc107"
        height={3}
        onLoaderFinished={() => setProgress(0)}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/DashboardApp" replace />} />
        <Route path="/login" element={!isAuthenticated ? <LoginPage handleButtonClick={handleButtonClick} /> : <Navigate to="/DashboardApp" />} />
        <Route path="/signup" element={<SignupPage handleButtonClick={handleButtonClick} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage handleButtonClick={handleButtonClick} />} />
        <Route path="/DashboardApp" element={isAuthenticated ? <DashboardApp /> : <Navigate to="/login" />} />
        <Route path="/UserProfile" element={isAuthenticated ? <UserProfile /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/DashboardApp" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserLogin from './Components/Authentication/JavaScript/UserLogin';
import GISSurveyorSignup from './Components/Authentication/JavaScript/SignUp';
import VerifyOtp from './Components/Authentication/JavaScript/VerifyOtp';
import ResetPassword from './Components/Authentication/JavaScript/ResetPassword';
import SsoComplete from './Components/Authentication/JavaScript/SsoComplete';
import Map from './Components/MapAndForms/JavaScript/map';

import { AuthProvider, useAuth } from './Components/Authentication/JavaScript/AuthContext';
import ProtectedRoute from './Components/Authentication/JavaScript/ProtectedRoute';


function AppRoutes() {
  const { authLoading } = useAuth();

  // ⛔ Prevent route rendering until auth is resolved
  if (authLoading) {
    return null; // or a loader
  }

  return (
    <Routes>
      <Route path="/" element={<UserLogin />} />
      <Route path="/signup" element={<GISSurveyorSignup />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/sso-complete" element={<SsoComplete />} />

      {/* 🔐 Protected Map Route */}
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <Map />
          </ProtectedRoute>
        }
      />
    </Routes>
    
  );
}

function App() {
  useEffect(() => {
    const applyTheme = (theme) => {
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme !== 'dark');
    };

    applyTheme(localStorage.getItem('geosurvey-theme') || 'light');

    const onThemeChange = (event) => {
      applyTheme(event.detail || 'light');
    };

    window.addEventListener('geosurvey-theme-change', onThemeChange);

    return () => {
      window.removeEventListener('geosurvey-theme-change', onThemeChange);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

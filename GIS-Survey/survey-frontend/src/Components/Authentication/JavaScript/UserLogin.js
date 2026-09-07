import { useState } from 'react';
import { Map, Lock, User, Eye, EyeOff, MapPin, Compass, Globe } from 'lucide-react';
import '../Styles/UserLogin.css';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://geo-survey-backend-2fy8.onrender.com";

export default function GISSurveyorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();

  // --- Forgot Password state ---
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleForgotPassword = async () => {
    setForgotError('');
    setForgotSuccess('');
    setResetLink('');
    setLinkCopied(false);

    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: forgotEmail }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setForgotError(data.message || 'Something went wrong. Please try again.');
        return;
      }

      setForgotSuccess(data.message || 'If this email is registered, a reset link has been sent.');
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    } catch (err) {
      setForgotError('Server error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSignIn = async () => {
  setError('');
  setSuccess('');

  if (!email || !password) {
    setError('Please enter email and password.');
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    // ❌ user not registered or wrong password
    if (!response.ok) {
      setError(data.message);
      return;
    }

    // ✅ user verified by backend
    login(data.token, data.user || { email });

    setSuccess("Login successful!");

    setTimeout(() => {
navigate("/map", { replace: true });    }, 1000);

  } catch (err) {
    setError("Server error. Please try again.");
  }
};

  return (
    <div className="container">
      {/* Left Side - Login Form */}
      <div className="login-side">
        <div className="login-form-container">
          {/* Logo and Title */}
          <div className="logo-title">
            <div className="logo-header">
              <div className="logo">
                <Map className="logo-icon" strokeWidth={1.5} />
              </div>
              <div className="logo-text">
                <h1 className="logo-name">GIS Surveyor</h1>
              </div>
            </div>
            <h2 className="welcome-title">Welcome Back</h2>
            <p className="welcome-subtitle">Please enter your credentials to continue</p>
          </div>

          {/* Login Form */}
          <div className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <User className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="your.email@company.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? (
                    <EyeOff className="icon" strokeWidth={1.5} />
                  ) : (
                    <Eye className="icon" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="remember-forgot">
              <div className="remember-me">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox"/>
                <label htmlFor="remember" className="checkbox-label">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="forgot-password"
                onClick={() => {
                  setForgotEmail(email || '');
                  setForgotError('');
                  setForgotSuccess('');
                  setResetLink('');
                  setShowForgotModal(true);
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Error Message */}
          {error && <p className="form-error">{error}</p>}

           {/* Success Message */}
          {success && <p className="form-success">{success}</p>}

            {/* Submit Button */}
            <button
              onClick={handleSignIn}
              className="submit-button"
            >
              Sign In
            </button>

            {/* Sign Up Link */}
            <div className="sign-up">
              <span className="sign-up-text">Don't have an account? </span>
              <Link to="/signup" className="sign-up-link">
                Create an account
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>© 2025 GIS Surveyor. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hero-side">
        <div className="hero-content">
          <div className="hero-header">
            <div className="hero-logo">
              <Globe className="hero-logo-icon" strokeWidth={1.5} />
            </div>
            <h2 className="hero-title">Professional Geographic Solutions</h2>
            <p className="hero-subtitle">Advanced surveying tools and mapping technology for professionals</p>
          </div>

          {/* Features */}
          <div className="features">
            <div className="feature">
              <div className="feature-icon">
                <div className="feature-icon-wrapper">
                  <MapPin className="feature-icon-svg" strokeWidth={1.5} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Precise Location Data</h3>
                <p className="feature-description">High-accuracy GPS and mapping coordinates</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <div className="feature-icon-wrapper">
                  <Compass className="feature-icon-svg" strokeWidth={1.5} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Real-time Analysis</h3>
                <p className="feature-description">Instant data processing and visualization</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <div className="feature-icon-wrapper">
                  <Map className="feature-icon-svg" strokeWidth={1.5} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Cloud Integration</h3>
                <p className="feature-description">Access your surveys from anywhere, anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #fff)',
              borderRadius: '12px',
              padding: '28px',
              width: '360px',
              maxWidth: '90%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Reset your password</h3>
            <p style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', opacity: 0.8 }}>
              Enter your registered email. We'll send you a link to reset your password.
            </p>

            <div className="form-group">
              <label htmlFor="forgot-email" className="label">
                Email Address
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <User className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input"
                  placeholder="your.email@company.com"
                />
              </div>
            </div>

            {forgotError && <p className="form-error">{forgotError}</p>}
            {forgotSuccess && <p className="form-success">{forgotSuccess}</p>}
            {resetLink && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <a className="reset-link-button" href={resetLink} style={{ flex: 1 }}>
                  Open reset page
                </a>
                <button
                  type="button"
                  className="password-toggle"
                  style={{ flex: '0 0 auto', padding: '0 14px' }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resetLink);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    } catch {
                      setLinkCopied(false);
                    }
                  }}
                >
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="submit-button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                style={{ flex: 1 }}
              >
                {forgotLoading ? 'Sending...' : 'Send reset link'}
              </button>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowForgotModal(false)}
                style={{ flex: '0 0 auto', padding: '0 16px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Map, Eye, EyeOff, MapPin, Compass, Globe } from 'lucide-react';
import '../Styles/SignUp.css';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://geo-survey-backend-2fy8.onrender.com/";

// Mirrors the backend rule so the user gets instant feedback instead of
// waiting for a round trip: min 8 chars, upper, lower, number, special char.
function getPasswordIssues(password) {
  const issues = [];
  if (!password || password.length < 8) issues.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) issues.push("one uppercase letter");
  if (!/[a-z]/.test(password)) issues.push("one lowercase letter");
  if (!/[0-9]/.test(password)) issues.push("one number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) issues.push("one special character");
  return issues;
}

export default function GISSurveyorSignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    organization: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    // clear previous messages
    setError("");
    setSuccess("");

    if (!formData.fullName || !formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordIssues = getPasswordIssues(formData.password);
    if (passwordIssues.length > 0) {
      setError(`Password must contain ${passwordIssues.join(", ")}.`);
      return;
    }

    if (!agreeToTerms) {
      setError("Please agree to Terms & Conditions.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Signup failed.");
        return;
      }

      setSuccess("OTP sent to your email. Redirecting to verification...");

      // The account is NOT created yet — the backend only created a pending
      // OTP record. Hand off to the verification screen with the email.
      setTimeout(() => {
        navigate("/verify-otp", { state: { email: formData.email } });
      }, 1000);

    } catch (error) {
      console.error("Signup error:", error);
      setError("Server error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup-container">
      {/* Left Side - Signup Form */}
      <div className="signup-side">
        <div className="signup-form-container">
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
            <h2 className="signup-title">Create Account</h2>
            <p className="signup-subtitle">Join our professional surveying platform</p>
          </div>

          {/* Signup Form */}
          <div className="signup-form">
            {/* Full Name Field */}
            <div className="form-group">
              <label htmlFor="fullName" className="label">
                Full Name *
              </label>
              <div className="input-wrapper">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="input"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="label">
                Email Address *
              </label>
              <div className="input-wrapper">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="your.email@company.com"
                  required
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="form-group">
              <label htmlFor="phone" className="label">
                Phone Number
              </label>
              <div className="input-wrapper">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Organization Field */}
            <div className="form-group">
              <label htmlFor="organization" className="label">
                Organization
              </label>
              <div className="input-wrapper">
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  value={formData.organization}
                  onChange={handleChange}
                  className="input"
                  placeholder="Your Company Name"
                />
              </div>
            </div>

            {/* Password Field */}
          <div className="form-group">
              <label htmlFor="password" className="label">
                Password *
              </label>
            <div className="input-wrapper">
              <input
             id="password"
             name="password"
             type={showPassword ? 'text' : 'password'}
             value={formData.password}
             onChange={handleChange}
             className="input has-eye"
             placeholder="Create a strong password"
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
            <p className="password-hint">
              Min 8 characters, with uppercase, lowercase, a number, and a special character.
            </p>
          </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="label">
                Confirm Password *
              </label>
              <div className="input-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  placeholder="Re-enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="icon" strokeWidth={1.5} />
                  ) : (
                    <Eye className="icon" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="terms">
              <input
                id="terms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="checkbox"
              />
              <label htmlFor="terms" className="checkbox-label">
                I agree to the{' '}
                <button type="button" className="terms-link">
                  Terms & Conditions
                </button>{' '}
                and{' '}
                <button type="button" className="terms-link">
                  Privacy Policy
                </button>
              </label>
            </div>

             {/* Error Message */}
            {error && <p className="form-error">{error}</p>}

             {/* Success Message */}
            {success && <p className="form-success">{success}</p>}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? "Sending OTP..." : "Create Account"}
            </button>

            {/* Login Link */}
            <div className="login-link">
              <span className="login-text">Already have an account? </span>
              <button
               onClick={() => navigate('/')}
               className="login-button"
              >
                Sign In
              </button>

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
            <h2 className="hero-title">Start Your Journey</h2>
            <p className="hero-subtitle">Join thousands of professionals using advanced surveying tools</p>
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
                <h3 className="feature-title">High Precision GPS</h3>
                <p className="feature-description">Sub-meter accuracy for professional surveys</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <div className="feature-icon-wrapper">
                  <Compass className="feature-icon-svg" strokeWidth={1.5} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Offline Mode</h3>
                <p className="feature-description">Work anywhere without internet connection</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <div className="feature-icon-wrapper">
                  <Map className="feature-icon-svg" strokeWidth={1.5} />
                </div>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Team Collaboration</h3>
                <p className="feature-description">Share projects and work together seamlessly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

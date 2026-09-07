import { useState } from "react";
import { Eye, EyeOff, Lock, Map } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../Styles/UserLogin.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://geo-survey-backend-2fy8.onrender.com/";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "Reset link is invalid or has expired.");
        return;
      }

      setSuccess("Password changed successfully. Redirecting to sign in...");
      setTimeout(() => navigate("/", { replace: true }), 1200);
    } catch (err) {
      setError("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container reset-password-page">
      <div className="login-side">
        <div className="login-form-container">
          <div className="logo-title">
            <div className="logo-header">
              <div className="logo">
                <Map className="logo-icon" strokeWidth={1.5} />
              </div>
              <div className="logo-text">
                <h1 className="logo-name">GIS Surveyor</h1>
              </div>
            </div>
            <h2 className="welcome-title">Create New Password</h2>
            <p className="welcome-subtitle">Enter a new password for your account.</p>
          </div>

          <div className="login-form">
            <div className="form-group">
              <label htmlFor="new-password" className="label">
                New Password
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="icon" strokeWidth={1.5} /> : <Eye className="icon" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-new-password" className="label">
                Confirm Password
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock className="icon" strokeWidth={1.5} />
                </div>
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="input"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((previous) => !previous)}
                  className="password-toggle"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="icon" strokeWidth={1.5} /> : <Eye className="icon" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Changing..." : "Change Password"}
            </button>

            <div className="sign-up">
              <Link to="/" className="sign-up-link">
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

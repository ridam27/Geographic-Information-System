import { useState, useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../Styles/VerifyOtp.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://geo-survey-backend-2fy8.onrender.com/";
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email is handed off from SignUp.js via navigate(..., { state: { email } }).
  // Fall back to sessionStorage so a page refresh doesn't strand the user.
  const emailFromState = location.state?.email;
  const [email] = useState(() => {
    if (emailFromState) {
      sessionStorage.setItem('pendingVerificationEmail', emailFromState);
      return emailFromState;
    }
    return sessionStorage.getItem('pendingVerificationEmail') || '';
  });

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!email) {
      // Nobody to verify — send them back to signup.
      navigate('/signup');
      return;
    }
    startCooldown();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const startCooldown = () => {
    clearInterval(timerRef.current);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    setError('');
    setSuccess('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Verification failed.');
        return;
      }

      setSuccess('Email verified! Your account has been created.');
      sessionStorage.removeItem('pendingVerificationEmail');

      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('Server error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError('');
    setSuccess('');
    setResending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Could not resend OTP.');
        return;
      }

      setSuccess('A new OTP has been sent to your email.');
      startCooldown();
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError('Server error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-otp-container">
      <div className="verify-otp-card">
        <div className="verify-otp-icon">
          <Mail strokeWidth={1.5} />
        </div>
        <h2 className="verify-otp-title">Verify your email</h2>
        <p className="verify-otp-subtitle">
          We sent a 6-digit code to <strong>{email}</strong>. It expires in 5 minutes.
        </p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="otp-input"
        />

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <button
          onClick={handleVerify}
          className="submit-button"
          disabled={verifying}
        >
          {verifying ? 'Verifying...' : 'Verify & Create Account'}
        </button>

        <button
          onClick={handleResend}
          className="resend-button"
          disabled={cooldown > 0 || resending}
        >
          {cooldown > 0
            ? `Resend OTP in ${cooldown}s`
            : resending
            ? 'Resending...'
            : 'Resend OTP'}
        </button>

        <button className="back-link" onClick={() => navigate('/signup')}>
          Use a different email
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import TopLoadingBar from 'react-top-loading-bar';
import './ForgotPasswordPage.css'; // Add custom styles if needed

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [progress, setProgress] = useState(0);

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Start the progress bar
    setProgress(20);

    // Simulate the forgot password logic (e.g., API call simulation)
    setTimeout(() => setProgress(60), 500);
    setTimeout(() => {
      console.log('Email for password reset:', email);
      alert('If an account with that email exists, a reset link will be sent to you.');
      setProgress(100);
    }, 1000);

    // Reset progress after completion
    setTimeout(() => setProgress(0), 1500);
  };

  return (
    <div className="forgot-password-container">
      {/* Add the TopLoadingBar */}
      <TopLoadingBar
        progress={progress}
        color="#ffc107"
        height={3}
        onLoaderFinished={() => setProgress(0)}
      />
      <div className="forgot-password-form">
        <h2>Forgot Password</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Enter your email address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="submit-btn">Reset Password</button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignupPage.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setErrorMessage('');
  };

  const validateInputs = () => {
    const { username, email, password, confirmPassword } = formData;
    if (username.length < 3) {
      return 'Username must be at least 3 characters long.';
    }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateInputs();
    if (error) {
      setErrorMessage(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/dashboard/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log('Signup successful:', data);
        navigate('/login');
      } else {
        setErrorMessage(data.message || 'Signup failed. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Error connecting to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="content-section">
        <h1 className="main-title">Create Account</h1>
        <h2 className="sub-title">Join our community</h2>
        <p className="description">
          Create an account to access interactive 2D and 3D data visualization capabilities, 
          robust data management tools, and the full suite of features in our GIS platform.
        </p>
      </div>
      
      <div className="signup-form">
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {errorMessage && <p className="error-message">{errorMessage}</p>}

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="terms"
              name="terms"
              required
            />
            <label htmlFor="terms">I agree to the Terms & Conditions</label>
          </div>

          <button type="submit" className="signup-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'CREATE ACCOUNT'}
          </button>

          <div className="divider">
            <span>or sign up with:</span>
          </div>

          <div className="social-login">
            <button type="button" className="social-btn facebook">
              <i className="fa fa-facebook"></i>
            </button>
            <button type="button" className="social-btn google">
              <i className="fa fa-google"></i>
            </button>
            <button type="button" className="social-btn twitter">
              <i className="fa fa-twitter"></i>
            </button>
            <button type="button" className="social-btn github">
              <i className="fa fa-github"></i>
            </button>
          </div>
          
          <div className="links">
            <Link to="/login">Already have an account? Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
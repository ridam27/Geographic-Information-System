import React from 'react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import './HeroSection.css'; // For custom styles

const HeroSection = ({ handleButtonClick }) => {
  return (
    <div className="hero-container">
      <h1>Welcome to Our cojag GIS Platform</h1>
      <p>Your all-in-one solution for spatial data visualization, analysis, and management</p>
      <div className="hero-buttons">
        <Link to="/login">
          <button className="btn btn-warning" onClick={handleButtonClick}>
            Get Started
          </button>
        </Link>
      </div>
    </div>
  );
};

export default HeroSection;

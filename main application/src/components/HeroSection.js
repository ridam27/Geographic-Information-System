import React from "react";
import { Link } from "react-router-dom";
import "./HeroSection.css";

const noop = () => {};

function HeroSection({ handleButtonClick = noop }) {
  return (
    <div className="hero-container">
      <h1>Welcome to Our cojag GIS Platform</h1>
      <p>Your all-in-one solution for spatial data visualization, analysis, and management</p>
      <div className="hero-buttons">
        <Link to="/login">
          <button type="button" className="btn btn-warning" onClick={handleButtonClick}>
            Get Started
          </button>
        </Link>
      </div>
    </div>
  );
}

export default HeroSection;

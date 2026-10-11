import React, { useState, useEffect, useMemo } from "react";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS for Map DashboardComponents
import Header from "./DashboardComponents/Header";
import Dashboard from "./DashboardComponents/Dashboard";
import "./App.css"; // Import the new CSS file
import "./DatabaseApp.css";

const App = () => {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("gis-viewer-dark-mode");
      return saved !== null ? saved === "true" : true; // Default to dark mode for modern GIS experience
    } catch (e) {
      return true;
    }
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  useEffect(() => {
    try {
      localStorage.setItem("gis-viewer-dark-mode", darkMode.toString());
    } catch (e) {}
    
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          primary: {
            main: darkMode ? "#90caf9" : "#6200ea",
          },
          secondary: {
            main: darkMode ? "#64b5f6" : "#018786",
          },
          background: {
            default: darkMode ? "#121212" : "#fafafa",
            paper: darkMode ? "#1e1e1e" : "#ffffff",
          },
          text: {
            primary: darkMode ? "#ffffff" : "#000000",
            secondary: darkMode ? "#b0bec5" : "#444444",
          },
        },
        typography: {
          fontFamily: "'Roboto', 'Inter', sans-serif",
          h1: {
            fontSize: "2rem",
            fontWeight: 600,
          },
          body1: {
            fontSize: "1rem",
            fontWeight: 400,
          },
        },
      }),
    [darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className={`app-container ${darkMode ? "dark-mode" : ""}`}>
        <div className="app-content">
          <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          <Dashboard darkMode={darkMode} />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default App;

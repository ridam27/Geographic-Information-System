import React from "react";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS for Map DashboardComponents
import Header from "./DashboardComponents/Header";
import Dashboard from "./DashboardComponents/Dashboard";
import "./App.css"; // Import the new CSS file

const App = () => {
  const theme = createTheme({
    palette: {
      primary: {
        main: "#6200ea", // Primary color (blue)
      },
      secondary: {
        main: "#018786", // Secondary color (dark teal)
      },
      background: {
        default: "#fafafa", // Light background color
        paper: "#fff", // Paper color (cards, modals, etc.)
      },
      text: {
        primary: "#000", // Black text color
        secondary: "#444", // Secondary text color
      },
    },
    typography: {
      fontFamily: "'Roboto', sans-serif", // Customize font family
      h1: {
        fontSize: "2rem", // Customize header size
        fontWeight: 600,
      },
      body1: {
        fontSize: "1rem", // Customize body text size
        fontWeight: 400,
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      {/* Apply global theme */}
      <CssBaseline />
      <div className="app-container">
        <div className="app-content">
          <Header />
          <Dashboard />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default App;

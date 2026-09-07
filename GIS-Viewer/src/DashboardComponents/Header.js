import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Public,
} from "@mui/icons-material";

const Header = ({ onToggleSidebar }) => {
  const handleHamburgerClick = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else {
      window.dispatchEvent(new CustomEvent("toggle-gis-sidebar"));
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 2, sm: 3 },
        height: "60px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 1100,
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Left section: Hamburger Menu & Logo */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Hamburger Menu Button */}
        <Tooltip title="Toggle Menu">
          <IconButton
            onClick={handleHamburgerClick}
            sx={{
              color: "#f8fafc",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              padding: "8px",
              transition: "all 0.2s ease-in-out",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                transform: "scale(1.05)",
                borderColor: "rgba(255, 255, 255, 0.25)",
              },
              "&:active": {
                transform: "scale(0.95)",
              },
            }}
          >
            <MenuIcon sx={{ fontSize: 24 }} />
          </IconButton>
        </Tooltip>

        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              width: 38,
              height: 38,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(59, 130, 246, 0.4)",
            }}
          >
            <Public sx={{ color: "#ffffff", fontSize: 22 }} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.3px",
                color: "#ffffff",
                fontSize: "1.25rem",
                fontFamily: "'Inter', 'Roboto', sans-serif",
              }}
            >
              Cojag
              <Typography
                component="span"
                sx={{
                  ml: 0.5,
                  color: "#38bdf8",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                }}
              >
                GIS
              </Typography>
            </Typography>
            <Box
              sx={{
                ml: 1,
                px: 1,
                py: 0.2,
                borderRadius: "6px",
                backgroundColor: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                display: { xs: "none", sm: "inline-block" },
              }}
            >
              Viewer
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Header;

import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem
} from "@mui/material";
import {
  Menu as MenuIcon,
  Map,
  Layers,
  Public,
  FindInPage,
  Download,
  Settings,
  Help,
  Person,
  Logout,
  Brightness4,
  Brightness7
} from "@mui/icons-material";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = ({ toggleDarkMode, darkMode }) => {
  const isMobile = useMediaQuery('(max-width:900px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
    
  };
  
  return (
    <>
      {/* Main Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
          px: 3,
          backgroundColor: darkMode ? "#1a1a2e" : "#ffffff",
          color: darkMode ? "#e0e0e0" : "#333333",
          borderBottom: `1px solid ${darkMode ? "#333344" : "#e0e0e0"}`,
          position: "sticky",
          top: 0,
          zIndex: 1100,
          height: "64px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.08)"
        }}
      >
        {/* Left side - Logo and title */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ display: "flex", alignItems: "center", ml: 6 }}>
  <Box 
    sx={{ 
      bgcolor: darkMode ? "#3a5199" : "#4b6bdd", 
      width: 36, 
      height: 36, 
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      mr: 1.5
    }}
  >
    <Public sx={{ color: "#ffffff", fontSize: 22 }} />
  </Box>
  <Typography 
    variant="h6" 
    component="div" 
    sx={{ 
      fontWeight: 700, 
      letterSpacing: "0.5px",
      color: darkMode ? "#ffffff" : "#333333"
    }}
  >
    GEOLITH
    <Typography 
      component="span" 
      sx={{ 
        ml: 0.5, 
        color: darkMode ? "#64b5f6" : "#5c78ff", 
        fontWeight: 500 
      }}
    >
      GIS
    </Typography>
  </Typography>
</Box>

        </Box>
        
        {/* Right - Actions */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton 
            color="inherit"
            sx={{ 
              mr: { xs: 1, md: 1.5 },
              color: darkMode ? "rgba(255,255,255,0.7)" : "#666666",
            }}
            onClick={toggleDarkMode}
          >
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          
          <Avatar 
            onClick={handleMenu}
            sx={{ 
              width: 36, 
              height: 36, 
              cursor: "pointer",
              bgcolor: darkMode ? "#64b5f6" : "#4b6bdd",
            }}
          >
            <Person />
          </Avatar>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            sx={{
              "& .MuiPaper-root": {
                borderRadius: 2,
                minWidth: 180,
                boxShadow: "0px 8px 20px rgba(0,0,0,0.15)",
                mt: 1.5
              }
            }}
          >
            <MenuItem onClick={handleClose}>Profile</MenuItem>
            <MenuItem onClick={handleClose}>Account Settings</MenuItem>
            <Divider />
            <MenuItem onClick={handleClose}>Help & Support</MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
              <ListItemIcon sx={{ color: "error.main" }}>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {/* Sidebar Drawer for Mobile */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: 260,
            backgroundColor: darkMode ? "#1a1a2e" : "#ffffff",
            color: darkMode ? "#e0e0e0" : "#333333",
            borderRight: `1px solid ${darkMode ? "#333344" : "#e0e0e0"}`,
          },
        }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
          <Box 
            sx={{ 
              bgcolor: darkMode ? "#3a5199" : "#4b6bdd", 
              width: 36, 
              height: 36, 
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mr: 1.5
            }}
          >
            <Public sx={{ color: "#ffffff", fontSize: 22 }} />
          </Box>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 700, 
              letterSpacing: "0.5px",
              color: darkMode ? "#ffffff" : "#333333"
            }}
          >
            GeoViz
            <Typography 
              component="span" 
              sx={{ 
                ml: 0.5, 
                color: darkMode ? "#64b5f6" : "#5c78ff", 
                fontWeight: 500 
              }}
            >
              Pro
            </Typography>
          </Typography>
        </Box>
        
        <Divider sx={{ backgroundColor: darkMode ? "#333344" : "#e0e0e0" }} />
        
        <List>
          <ListItem button selected>
            <ListItemIcon sx={{ color: darkMode ? "#64b5f6" : "#5c78ff" }}>
              <Map />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
          
          <ListItem button>
            <ListItemIcon sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "#666666" }}>
              <Layers />
            </ListItemIcon>
            <ListItemText primary="Projects" />
          </ListItem>
          
          <ListItem button>
            <ListItemIcon sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "#666666" }}>
              <FindInPage />
            </ListItemIcon>
            <ListItemText primary="Analysis" />
          </ListItem>
          
          <ListItem button>
            <ListItemIcon sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "#666666" }}>
              <Public />
            </ListItemIcon>
            <ListItemText primary="Data Library" />
          </ListItem>
        </List>
        
        <Divider sx={{ backgroundColor: darkMode ? "#333344" : "#e0e0e0" }} />
        
        <List>
          <ListItem button>
            <ListItemIcon sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "#666666" }}>
              <Download />
            </ListItemIcon>
            <ListItemText primary="Export Data" />
          </ListItem>
          
          <ListItem button>
            <ListItemIcon sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "#666666" }}>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
          
          <ListItem button>
            <ListItemIcon sx={{ color: darkMode ? "rgba(255,255,255,0.7)" : "#666666" }}>
              <Help />
            </ListItemIcon>
            <ListItemText primary="Help & Support" />
          </ListItem>
        </List>
      </Drawer>
    </>
  );
};

export default Header;

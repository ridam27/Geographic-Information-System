import React, { useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  Tooltip,
  Typography,
  useMediaQuery,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import LayersIcon from "@mui/icons-material/Layers";
import PublicIcon from "@mui/icons-material/Public";
import ImageIcon from "@mui/icons-material/Image";
import MovieIcon from "@mui/icons-material/Movie";

// Import individual components
import Location from "./sidebarOptions/Location";
import ShapeFileExtractor from "./sidebarOptions/ShapeFileExtractor";
import KML from "./sidebarOptions/KML";
import KMZ from "./sidebarOptions/KMZ";
import TIF from "./sidebarOptions/Tif";
import Welcome from "./Welcome";
import "./Dashboard.css";
import VideoTracker from "./sidebarOptions/VideoTracker/VideoTracker"; // ⭐ NEW IMPORT


const Dashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("Location");
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Define all sidebar options in one place
  const sidebarOptions = [
  { text: "Location", icon: <LocationOnIcon /> },
  { text: "Shape File Extractor", icon: <FileDownloadIcon /> },
  { text: "KML", icon: <LayersIcon /> },
  { text: "KMZ", icon: <PublicIcon /> },
  { text: "TIF", icon: <ImageIcon /> },
  { text: "Video Tracker", icon: <MovieIcon /> },   // ⭐ NEW BUTTON
];


  const handleOptionClick = (option) => {
    setSelectedOption(option);
    if (isSmallScreen) {
      setSidebarOpen(false);
    }
  };

  const renderContent = () => {
    switch (selectedOption) {
      case "Location":
        return <Location />;
      case "Shape File Extractor":
        return <ShapeFileExtractor />;
      case "KML":
        return <KML />;
      case "KMZ":
        return <KMZ />;
      case "TIF":
        return <TIF />;
      case "Video Tracker":
        return <VideoTracker />;

      default:
        return <Location />;
    }
  };

  return (
    <Box>
      {/* Toggle Sidebar Button */}
      <Tooltip title="Toggle Sidebar">
        <Box className="sidebar-toggle-container">
          <IconButton
            aria-label="toggle sidebar"
            onClick={toggleSidebar}
            className="sidebar-toggle-button"
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Tooltip>

      {/* Sidebar Drawer */}
      <Drawer
        variant={isSmallScreen ? "temporary" : "persistent"}
        anchor="left"
        open={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        className="sidebar-drawer"
      >
        <Box role="presentation" className="sidebar-content">
          {/* Sidebar Title */}
          <Typography variant="h5" className="sidebar-title">
            My Dashboard
          </Typography>

          {/* Sidebar Options */}
          <List className="sidebar-options-list">
            {sidebarOptions.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => handleOptionClick(item.text)}
                className={`sidebar-option-item ${
                  selectedOption === item.text ? "selected" : ""
                }`}
              >
                <ListItemIcon className="sidebar-option-icon">
                  {item.icon}
                </ListItemIcon>
                <Typography>{item.text}</Typography>
              </ListItem>
            ))}
          </List>

          <Divider className="sidebar-divider" />
        </Box>
      </Drawer>

      {/* Floating Icons when Sidebar is Closed */}
      {!isSidebarOpen && (
        <>
          {/* Invisible hover trigger area */}
          <Box className="floating-icons-trigger" />
          
          {/* Actual floating icons */}
          <Box className="floating-icons-container">
            {sidebarOptions.map((item) => (
              <Tooltip key={item.text} title={item.text} placement="right">
                <IconButton
                  onClick={() => handleOptionClick(item.text)}
                  className={`floating-icon-button ${
                    selectedOption === item.text ? "selected" : ""
                  }`}
                >
                  {item.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </>
      )}

      {/* Main Content */}
      <Box
        className="main-content"
        style={{ marginLeft: isSmallScreen || !isSidebarOpen ? 0 : 250 }}
      >
        {renderContent()} 
      </Box>
    </Box>
  );
};

export default Dashboard;
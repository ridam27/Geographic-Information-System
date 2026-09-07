import React, { useState } from "react";
import Header from "./Header"
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  useMediaQuery,
  Divider,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import LayersIcon from "@mui/icons-material/Layers";
import PublicIcon from "@mui/icons-material/Public";

const Dashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLocked, setLocked] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const toggleSidebar = () => {
    if (!isLocked) setSidebarOpen(!isSidebarOpen);
  };

  const toggleLock = () => {
    setLocked(!isLocked);
    if (isLocked) setSidebarOpen(false);
  };

  const content = {
    Location: {
      title: "Location",
      description:
        "View detailed information about specific locations. Use our tools to pinpoint and analyze locations for your projects.",
    },
    "Shape File Extractor": {
      title: "Shape File Extractor",
      description:
        "Easily extract and manage shape files for GIS applications. This tool supports multiple formats for seamless integration.",
    },
    KML: {
      title: "KML (Keyhole Markup Language)",
      description:
        "Visualize geographic data in KML format. Use this feature to explore map layers and geospatial data.",
    },
    KMZ: {
      title: "KMZ (Compressed KML)",
      description:
        "Manage KMZ files with ease. Access compressed versions of KML files for efficient storage and visualization.",
    },
  };

  return (
    <Box>
      <Header/>
      {/* Toggle Sidebar Button */}
      <Tooltip title="Toggle Sidebar">
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            position: "fixed",
            top: 10,
            left: 10,
            zIndex: 1300,
          }}
        >
          <IconButton
            aria-label="toggle sidebar"
            onClick={toggleSidebar}
            style={{
              backgroundColor: "#1976d2",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              borderRadius: "50%",
            }}
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
        style={{
          transition: "transform 0.3s ease-in-out",
        }}
      >
        <Box
          role="presentation"
          style={{
            width: 250,
            height: "100%",
            backgroundColor: "#263238",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "20px 15px",
            boxSizing: "border-box",
          }}
        >
          {/* Sidebar Title */}
          <Typography
            variant="h5"
            style={{
              marginLeft: "35px",
              color: "#fff",
              fontWeight: "bold",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            My Dashboard
          </Typography>

          {/* Sidebar Options */}
          <List style={{ marginTop: 20, width: "100%" }}>
            {[
              { text: "Location", icon: <LocationOnIcon /> },
              { text: "Shape File Extractor", icon: <FileDownloadIcon /> },
              { text: "KML", icon: <LayersIcon /> },
              { text: "KMZ", icon: <PublicIcon /> },
            ].map((item, index) => (
              <ListItem
                button
                key={index}
                onClick={() => setSelectedOption(item.text)}
                style={{
                  color: "#B0BEC5",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  transition: "background-color 0.2s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#37474f")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <ListItemIcon style={{ color: "#B0BEC5", minWidth: "40px" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>

          <Divider style={{ backgroundColor: "#B0BEC5" }} />

          {/* Lock/Unlock Button */}
          <Box style={{ textAlign: "center", marginTop: 20 }}>
            <Tooltip title={isLocked ? "Unlock Sidebar" : "Lock Sidebar"}>
              <IconButton
                aria-label="lock or unlock sidebar"
                onClick={toggleLock}
                style={{
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  borderRadius: "50%",
                }}
              >
                {isLocked ? <LockIcon /> : <LockOpenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        style={{
          marginLeft: isSmallScreen || !isSidebarOpen ? 0 : 250,
          padding: "20px",
          transition: "margin-left 0.3s ease-in-out",
        }}
      >
        {selectedOption ? (
          <Card
            style={{
              backgroundColor: "#f5f5f5",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <CardContent>
              <Typography
                variant="h5"
                component="div"
                style={{ color: "#1976d2", marginBottom: "10px" }}
              >
                {content[selectedOption].title}
              </Typography>
              <Typography variant="body1" style={{ color: "#333" }}>
                {content[selectedOption].description}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Typography variant="h6" style={{ color: "#888" }}>
            Welcome to My Dashboard! Select an option from the sidebar to view details.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;

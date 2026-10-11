import { Suspense, lazy, useEffect } from "react";
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
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePersistentState, useScrollRestoration } from "../hooks/usePersistentState";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import LayersIcon from "@mui/icons-material/Layers";
import PublicIcon from "@mui/icons-material/Public";
import ImageIcon from "@mui/icons-material/Image";
import MovieIcon from "@mui/icons-material/Movie";

// Welcome is the default view, so it's loaded eagerly.
import Welcome from "./Welcome";
import "./Dashboard.css";

// Every other tool is heavy (jszip, georaster, leaflet-draw, ...) and is only
// needed once the user actually picks it, so it's code-split via React.lazy —
// this keeps the initial bundle/parse time small.
const Location = lazy(() => import("./sidebarOptions/Location"));
const ShapeFileExtractor = lazy(() => import("./sidebarOptions/ShapeFileExtractor"));
const KML = lazy(() => import("./sidebarOptions/KML"));
const KMZ = lazy(() => import("./sidebarOptions/KMZ"));
const TIF = lazy(() => import("./sidebarOptions/Tif"));
const VideoTracker = lazy(() => import("./sidebarOptions/VideoTracker/VideoTracker"));

const LazyFallback = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "calc(100vh - 64px)",
    }}
  >
    <CircularProgress />
  </Box>
);


const Dashboard = ({ darkMode }) => {
  const [isSidebarOpen, setSidebarOpen] = usePersistentState("dashboard-sidebar-open", false);
  const [selectedOption, setSelectedOption] = usePersistentState("dashboard-selected-option", "");
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Restore page scroll position after a refresh
  useScrollRestoration("dashboard-main");

  // Coming in via the Main application's SSO handoff (?tab=Location) lands
  // straight on that tab instead of the Welcome screen — no extra click.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    const validTabs = ["Location", "Shape File Extractor", "KML", "KMZ", "TIF", "Video Tracker"];
    if (tab && validTabs.includes(tab)) {
      setSelectedOption(tab);
      // Clean the URL so a later refresh doesn't keep forcing this tab.
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        return <Welcome />;
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
        <Suspense fallback={<LazyFallback />}>
          {renderContent()}
        </Suspense>
      </Box>
    </Box>
  );
};

export default Dashboard;
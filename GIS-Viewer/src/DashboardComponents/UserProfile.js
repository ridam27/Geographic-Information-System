import React from 'react';
import { Avatar, Button, Typography, Paper } from '@mui/material';
import './UserProfile.css'; // Import the external CSS file

const UserProfile = ({ userName, onLogout }) => {
  const handleLogout = () => {
    // Call the onLogout function passed as a prop
    if (onLogout) {
      onLogout();
    } else {
      console.log('Logout function is not provided');
    }
  };

  return (
    <Paper className="profileContainer">
      <Avatar
        alt="User Profile"
        src="https://icons-for-free.com/iff/png/512/instagram+profile+user+icon-1320184028326496024.png" // Replace with actual user image URL
        className="avatar"
      />
      <Typography variant="h6" className="userName">
        {userName || 'User Name'} {/* Display user's name */}
      </Typography>
      <Button
        className="logoutButton"
        variant="contained"
        onClick={handleLogout}
      >
        Logout
      </Button>
    </Paper>
  );
};

export default UserProfile;

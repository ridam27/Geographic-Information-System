import React from 'react';
import { IconButton, Switch, Box } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';

const DarkLight = ({ toggleDarkMode, darkMode }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton onClick={toggleDarkMode} color="inherit">
        {darkMode ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
      <Switch
        checked={darkMode}
        onChange={toggleDarkMode}
        color="default"
        inputProps={{ 'aria-label': 'dark mode toggle' }}
      />
    </Box>
  );
};

export default DarkLight;

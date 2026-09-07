// backend/routes/userRoutes.js

const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
// const auth = require('../middleware/authMiddleware'); // auth middleware is not used here

const router = express.Router();

// Signup route remains the same
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const newUser = new User({ username, email, password });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Create a user object without the password
    const userSessionData = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };

    req.session.user = userSessionData; // Store clean user data in session

    // CHANGED: Send the user data back to the frontend
    res.status(200).json({ message: 'Login successful', user: userSessionData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Logout route remains the same
router.post('/logout', (req, res) => {
  // Check if a session exists
  if (req.session) {
    // Use the destroy method to remove the session from the server's store
    req.session.destroy(err => {
      if (err) {
        // Handle any errors that occur during session destruction
        res.status(500).json({ message: 'Could not log out, please try again.' });
      } else {
        // (Best Practice) Explicitly clear the cookie from the browser
        res.clearCookie('connect.sid'); // 'connect.sid' is the default session cookie name
        
        // Send a success response
        res.status(200).json({ message: 'Logout successful' });
      }
    });
  } else {
    // If no session exists, the user is already effectively logged out
    res.end();
  }
});

// Check Auth Route
router.get('/check-auth', (req, res) => {
  if (req.session.user) {
    // CHANGED: Send the user data if they are authenticated
    res.status(200).json({ isAuthenticated: true, user: req.session.user });
  } else {
    res.status(401).json({ isAuthenticated: false });
  }
});

module.exports = router;

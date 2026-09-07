// src/context/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Create the context
const AuthContext = createContext(null);
const API_URL = process.env.REACT_APP_API_URL;

// 2. Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To check initial auth status

  useEffect(() => {
    // Check if the user is already logged in when the app loads
    const checkLoggedIn = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dashboard/users/check-auth`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok && data.isAuthenticated) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check failed', error);
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  console.log("API URL =", process.env.REACT_APP_API_URL);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/dashboard/users/logout`, {
        method: 'POST',
        credentials: 'include' 
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Create a custom hook to use the context easily
export const useAuth = () => {
  return useContext(AuthContext);
};
import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('userRoutes');
  return token ? children : <Navigate to="/LoginPage" />;
};

export default PrivateRoute;

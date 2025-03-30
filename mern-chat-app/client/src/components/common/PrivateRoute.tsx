import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // If not logged in, redirect to login page with the return url
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in but no group, redirect to join group page
  if (!user.groupId && location.pathname !== '/join-group') {
    return <Navigate to="/join-group" replace />;
  }

  // Authorized, render component
  return <Outlet />;
};

export default PrivateRoute;
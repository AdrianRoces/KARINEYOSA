import React from 'react';
import { Navigate } from 'react-router-dom';

// Role-based access control component
export const RoleBasedRoute = ({ children, isLoggedIn, userRole, requiredRoles = [] }) => {
  const normalizedRole = String(userRole || '').toLowerCase();
  const normalizedRequiredRoles = requiredRoles.map((role) => String(role).toLowerCase());

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (normalizedRequiredRoles.length > 0 && !normalizedRequiredRoles.includes(normalizedRole)) {
    const redirectPath = normalizedRole === 'admin' ? '/dashboard' : '/inventory';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

// Convenience components for specific roles
export const AdminRoute = ({ children, isLoggedIn, userRole }) => (
  <RoleBasedRoute isLoggedIn={isLoggedIn} userRole={userRole} requiredRoles={['admin']}>
    {children}
  </RoleBasedRoute>
);

export const UserRoute = ({ children, isLoggedIn, userRole }) => (
  <RoleBasedRoute isLoggedIn={isLoggedIn} userRole={userRole} requiredRoles={['admin', 'user', 'employee']}>
    {children}
  </RoleBasedRoute>
);

export const AdminOnlyRoute = ({ children, isLoggedIn, userRole }) => (
  <RoleBasedRoute isLoggedIn={isLoggedIn} userRole={userRole} requiredRoles={['admin']}>
    {children}
  </RoleBasedRoute>
);

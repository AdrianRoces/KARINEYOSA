import React from 'react';
import { Navigate } from 'react-router-dom';

// Role-based access control component
export const RoleBasedRoute = ({ children, isLoggedIn, userRole, requiredRoles = [] }) => {
  // Fallback to localStorage if userRole prop is not provided
  const fallbackUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleFromStorage = String(fallbackUser.role || fallbackUser.Role || '').trim().toLowerCase();
  const passedRole = String(userRole || '').trim().toLowerCase();
  
  let effectiveRole = passedRole || roleFromStorage || 'employee';
  if (effectiveRole === 'user') effectiveRole = 'employee';
  
  const normalizedRequiredRoles = requiredRoles.map((role) => String(role).toLowerCase());

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (normalizedRequiredRoles.length > 0 && !normalizedRequiredRoles.includes(effectiveRole)) {
    const redirectPath = effectiveRole === 'admin' ? '/dashboard' : '/inventory';
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
  <RoleBasedRoute isLoggedIn={isLoggedIn} userRole={userRole} requiredRoles={['admin', 'employee']}>
    {children}
  </RoleBasedRoute>
);

export const AdminOnlyRoute = ({ children, isLoggedIn, userRole }) => (
  <RoleBasedRoute isLoggedIn={isLoggedIn} userRole={userRole} requiredRoles={['admin']}>
    {children}
  </RoleBasedRoute>
);
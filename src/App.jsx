import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/dashboard/index';
import Inventory from './components/inventory/index';
import SalesHistory from './components/salesHistory/index';
import LandingPage from './components/LandingPage';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserManagement from './components/admin/UserManagement';
import StockActivity from './components/admin/StockActivity';
import { AdminOnlyRoute, UserRoute } from './utils/RoleBasedRoute';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { auth, profiles } from './supabase';

// Main Application Component
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profileLoadPromise = { current: null };

    const loadUserProfile = async (user) => {
      if (profileLoadPromise.current) {
        return profileLoadPromise.current;
      }

      profileLoadPromise.current = (async () => {
        if (!user) {
          setIsLoggedIn(false);
          setUserRole(null);
          localStorage.removeItem('user');
          localStorage.removeItem('isLoggedIn');
          return;
        }

        try {
          const { profile, error } = await profiles.getOrCreate(user);
          
          if (profile) {
            // NEW SECURITY CHECK: Prevent access on reload if disabled/pending
            if (profile.status !== 'approved' || profile.is_active === false) {
              await auth.signOut();
              setIsLoggedIn(false);
              setUserRole(null);
              localStorage.removeItem('user');
              localStorage.removeItem('isLoggedIn');
              toast.error('Your session was terminated because your account is pending, rejected, or disabled.');
              return;
            }

            setIsLoggedIn(true);
            setUserRole(profile.role);
            localStorage.setItem('user', JSON.stringify({
              id: user.id,
              email: user.email,
              username: profile.username,
              role: profile.role,
              status: profile.status
            }));
            localStorage.setItem('isLoggedIn', 'true');
            return;
          }
        } catch (err) {
          console.error('Error loading profile on auth state change:', err);
        }

        setIsLoggedIn(false);
        setUserRole(null);
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
      })();

      try {
        return await profileLoadPromise.current;
      } finally {
        profileLoadPromise.current = null;
      }
    }

    let authSubscription = null;

    const initAuth = async () => {
      try {
        const result = await auth.getSession();
        const user = result?.session?.user;
        await loadUserProfile(user);
      } catch (err) {
        console.error('Error checking initial auth session:', err);
      } finally {
        setLoading(false);
      }

      authSubscription = auth.onAuthStateChange(async (event, session) => {
        try {
          await loadUserProfile(session?.user);
        } catch (err) {
          console.error('Error during auth state change:', err);
        }
      });
    };

    initAuth();

    return () => authSubscription?.data?.subscription?.unsubscribe?.() ?? authSubscription?.unsubscribe?.();
  }, []);

  const handleLogout = async () => {
    const { error } = await auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }

    setIsLoggedIn(false);
    setUserRole(null);
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  const isInRecoveryMode = localStorage.getItem('recoveryMode') === 'true';

  const AppContent = () => {
    const location = useLocation();
    const isResetPath = location.pathname === '/reset-password';
    const shouldShowApp = isLoggedIn && !isInRecoveryMode && !isResetPath;

    if (shouldShowApp) {
      return (
        <div className="min-h-screen w-screen bg-[#f5eef3] dark:bg-dark-background overflow-visible">
          <Sidebar onLogout={handleLogout} userRole={userRole}>
            <main className="w-full h-full">
              <Routes>
                <Route 
                  path="/dashboard" 
                  element={
                    <AdminOnlyRoute isLoggedIn={isLoggedIn} userRole={userRole}>
                      <Dashboard />
                    </AdminOnlyRoute>
                  } 
                />
                <Route 
                  path="/inventory" 
                  element={
                    <UserRoute isLoggedIn={isLoggedIn} userRole={userRole}>
                      <Inventory userRole={userRole} />
                    </UserRoute>
                  } 
                />
                <Route 
                  path="/sales-history" 
                  element={
                    <AdminOnlyRoute isLoggedIn={isLoggedIn} userRole={userRole}>
                      <SalesHistory />
                    </AdminOnlyRoute>
                  } 
                />
                <Route 
                  path="/admin/users" 
                  element={
                    <AdminOnlyRoute isLoggedIn={isLoggedIn} userRole={userRole}>
                      <UserManagement />
                    </AdminOnlyRoute>
                  } 
                />
                <Route 
                  path="/admin/stock-activity" 
                  element={
                    <AdminOnlyRoute isLoggedIn={isLoggedIn} userRole={userRole}>
                      <StockActivity />
                    </AdminOnlyRoute>
                  } 
                />
                <Route 
                  path="/" 
                  element={
                    userRole === 'admin' 
                      ? <Navigate to="/dashboard" replace /> 
                      : <Navigate to="/inventory" replace />
                  } 
                />
                <Route path="*" element={<Navigate to={userRole === 'admin' ? '/dashboard' : '/inventory'} replace />} />
              </Routes>
            </main>
          </Sidebar>
        </div>
      );
    }

    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        <Route path="/register" element={<LandingPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };

  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ position: 'fixed', top: '76px', right: '20px', zIndex: 10000 }}
      />
      <AppContent />
    </Router>
  );
}

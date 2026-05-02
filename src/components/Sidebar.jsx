import React, { useState, useEffect } from 'react';
import DateRangeFilter from './dashboard/DateRangeFilter';
import NotificationsDrawer from './dashboard/NotificationsDrawer';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Sidebar({ children, onLogout, userRole }) {
  const [collapsed, setCollapsed] = useState(true);
  const [blurred, setBlurred] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active panel from URL path
  const normalizedRole = String(userRole || '').toLowerCase();
  const path = location.pathname.split('/')[1] || (normalizedRole === 'admin' ? 'dashboard' : 'inventory');
  const [activePanel, setActivePanel] = useState(path);
  
  // Update active panel when location changes or on initial load
  useEffect(() => {
    const currentPath = location.pathname.split('/')[1] || (normalizedRole === 'admin' ? 'dashboard' : 'inventory');
    setActivePanel(currentPath);
  }, [location.pathname, normalizedRole]);

  // Animation state for main content
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setContentVisible(true);
  }, []);

  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Date range state for header filter — persist to localStorage and broadcast
  const [selectedDateRange, setSelectedDateRange] = useState(
    localStorage.getItem('selectedDateRange') || 'today'
  );

  useEffect(() => {
    // Broadcast existing selection on mount so dashboard can pick it up
    window.dispatchEvent(new CustomEvent('dateRangeChange', { detail: selectedDateRange }));
  }, []);

  useEffect(() => {
    // When leaving the dashboard, reset the shared date filter back to today.
    if (activePanel !== 'dashboard' && selectedDateRange !== 'today') {
      setSelectedDateRange('today');
      localStorage.setItem('selectedDateRange', 'today');
    }
  }, [activePanel, selectedDateRange]);

  useEffect(() => {
    // Always broadcast current filter value when dashboard becomes active.
    if (activePanel === 'dashboard') {
      window.dispatchEvent(new CustomEvent('dateRangeChange', { detail: selectedDateRange }));
    }
  }, [activePanel, selectedDateRange]);

  const handleDateRangeChange = (range) => {
    setSelectedDateRange(range);
    localStorage.setItem('selectedDateRange', range);
    window.dispatchEvent(new CustomEvent('dateRangeChange', { detail: range }));
  };

  const items = [
    { 
      id: 'dashboard', 
      label: 'HOME', 
      icon: '/icons/home.png',
      roles: ['admin']
    },
    { 
      id: 'inventory', 
      label: 'INVENTORY', 
      icon: '/icons/inventory.png',
      roles: ['admin', 'user']
    },
    {
      id: 'sales-history',
      label: 'SALES HISTORY',
      icon: '/icons/saleshistory.png',
      roles: ['admin']
    },
    {
      id: 'admin/users',
      label: 'USER MANAGEMENT',
      icon: '/icons/usermanagement.png',
      roles: ['admin']
    }
    ,
    {
      id: 'admin/stock-activity',
      label: 'STOCK ACTIVITY',
      icon: '/icons/inventory.png',
      roles: ['admin']
    }
  ];

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockUsername, setUnlockUsername] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [pendingTargetPath, setPendingTargetPath] = useState(null);

  const isAdminOverrideActive = () => {
    try {
      const v = sessionStorage.getItem('adminOverrideUntil');
      if (!v) return false;
      return parseInt(v, 10) > Date.now();
    } catch {
      return false;
    }
  };

  const handleNavigation = (itemId) => {
    const item = items.find(i => i.id === itemId);
    const normalizedRoleForCheck = String(userRole || '').toLowerCase();
    const allowed = item?.roles?.includes(normalizedRoleForCheck) || isAdminOverrideActive();
    if (!allowed) {
      // Open admin unlock modal
      setPendingTargetPath(itemId);
      setShowUnlockModal(true);
      return;
    }

    setActivePanel(itemId);
    navigate(`/${itemId}`);
  };

  const tryUnlockAsAdmin = async () => {
    setUnlockError('');
    try {
      // Use Supabase auth to validate admin
      const { data, error } = await supabase.auth.signInWithPassword({
        email: unlockUsername,
        password: unlockPassword
      });

      if (error) {
        setUnlockError(error.message || 'Invalid admin credentials');
        return;
      }

      // Check if user has admin role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profileData || profileData.role !== 'admin') {
        setUnlockError('User is not an admin');
        await supabase.auth.signOut();
        return;
      }

      // grant a short-lived override (5 minutes)
      const until = Date.now() + 5 * 60 * 1000;
      sessionStorage.setItem('adminOverrideUntil', String(until));
      setShowUnlockModal(false);
      setUnlockPassword('');
      setUnlockUsername('');

      if (pendingTargetPath) {
        setActivePanel(pendingTargetPath);
        navigate(`/${pendingTargetPath}`);
        setPendingTargetPath(null);
      }
    } catch (err) {
      setUnlockError('Error validating admin credentials');
    }
  };

  const today = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today
    .toLocaleDateString('en-US', options)
    .toUpperCase();

  const getPanelLabel = (panelId) => {
    const matched = items.find((item) => item.id === panelId);
    return matched?.label || panelId.replace(/\//g, ' ').replace(/-/g, ' ').toUpperCase();
  };

  return (
    <>
      {/* RESPONSIVE HEADER */}
      <header className="w-full bg-[#f5eef3] shadow-[0_2px_12px_rgba(140,60,180,0.08)] z-50 fixed top-0 left-0 right-0 font-satoshi">
        {/* Desktop Header (hidden on mobile) */}
        <div className="hidden lg:flex h-[65px] items-center justify-between px-4 lg:px-10 py-2 lg:py-0">
          {/* Left: Dashboard Title */}
          <div className="flex items-center flex-1">
            <h1 className="text-[32px] lg:text-[45px] font-bold text-[#8E1751] truncate">
              {activePanel.toUpperCase()}
            </h1>
          </div>

          {/* Right: Date and Filter */}
          <div className="flex items-center gap-2 lg:gap-4 ml-auto">
            {/* Date */}
            <div className="flex items-center text-[14px] lg:text-[17px] font-semibold font-satoshi whitespace-nowrap">
              <span className="text-[#8E1751] tracking-wide mr-2">DATE:</span>
              <div className="border border-gray-300 rounded-full px-3 lg:px-4 py-1 text-[#8E1751]">
                {new Date()
                  .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  .toUpperCase()}
              </div>
            </div>

            {/* Notification button */}
            <div className="flex items-center">
              {['dashboard', 'inventory', 'sales-history'].includes(activePanel) && (
                <NotificationsDrawer />
              )}
            </div>

            {/* Date Filter Dropdown */}
            <div className="flex items-center">
              {activePanel === 'dashboard' && (
                <DateRangeFilter
                  selectedDateRange={selectedDateRange}
                  onDateRangeChange={handleDateRangeChange}
                />
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={async () => {
                if (onLogout) await onLogout();
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
                navigate('/login');
              }}
              className="px-3 lg:px-4 py-2 text-gray-800 text-sm lg:text-base rounded-lg font-medium transition hover:opacity-80 border border-gray-400"
              style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Header */}
        <div className="lg:hidden h-[60px] flex items-center justify-between px-4 py-2">
          {/* Hamburger Menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-[#8E1751]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mobile Title */}
          <h1 className="text-[24px] font-bold text-[#8E1751] flex-1 text-center truncate">
            {getPanelLabel(activePanel)}
          </h1>

          {/* More Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
              aria-label="More options"
            >
              <svg className="w-6 h-6 text-[#8E1751]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showHeaderMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-40 p-4 space-y-3">
                {/* Date Display */}
                <div className="flex items-center text-sm font-semibold font-satoshi">
                  <span className="text-[#8E1751]">Date:</span>
                  <div className="ml-2 border border-gray-300 rounded-full px-3 py-1 text-[#8E1751] text-xs">
                    {new Date()
                      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      .toUpperCase()}
                  </div>
                </div>

                {/* Notification for Mobile */}
                {['dashboard', 'inventory', 'sales-history'].includes(activePanel) && (
                  <div className="border-t pt-3">
                    <NotificationsDrawer />
                  </div>
                )}

              {/* Date Filter for Mobile */}
              {activePanel === 'dashboard' && (
                <div className="border-t pt-3">
                  <DateRangeFilter
                    selectedDateRange={selectedDateRange}
                    onDateRangeChange={handleDateRangeChange}
                  />
                </div>
              )}

              {/* Logout for Mobile */}
              <button
                onClick={async () => {
                  if (onLogout) await onLogout();
                  localStorage.removeItem('user');
                  localStorage.removeItem('isLoggedIn');
                  navigate('/login');
                  setShowHeaderMenu(false);
                }}
                className="w-full px-3 py-2 bg-[#8E1751] hover:bg-[#6a0f39] text-white rounded-lg font-medium transition text-sm border-t pt-3"
              >
                Logout
              </button>
            </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* RESPONSIVE SIDEBAR */}
      <div
        className={`fixed left-0 top-[60px] lg:top-[65px] h-[calc(100vh-60px)] lg:h-[calc(100vh-65px)] transition-all duration-300 z-40 shadow-[0_4px_24px_rgba(140,60,180,0.10)] ${
          isMobile
            ? sidebarOpen ? 'w-[250px] translate-x-0' : '-translate-x-full w-[250px]'
            : collapsed ? 'w-20' : 'w-[250px]'
        }`}
        style={{
          background: 'linear-gradient(135deg, #e7d6f7 0%, #f7d6d0 100%)',
          borderTopLeftRadius: isMobile ? '0px' : '7px',
          borderTopRightRadius: isMobile ? '0px' : '7px',
          overflow: 'hidden'
        }}
        onMouseEnter={() => {
          if (!isMobile) {
            setBlurred(true);
            setCollapsed(false);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            setBlurred(false);
            setCollapsed(true);
          }
        }}
      >
        <div className="flex flex-col h-full justify-between overflow-y-auto">
          <div>
            {/* Branding Header */}
            <div className={isMobile ? 'p-4 border-b border-[#d2679f]' : (collapsed ? 'h-0 overflow-hidden' : 'p-4 border-b border-[#d2679f]')}>
              {(isMobile || !collapsed) && (
                <div className="flex flex-col items-center justify-center text-[#8E1751]">
                  <h1 className="text-[28px] lg:text-[30px] font-goudy">KARINEYOSA</h1>
                  <p className="text-[12px] lg:text-[13px] leading-tight font-goudy text-center">
                    What you see<br />
                    <span className="pl-6">is what you get</span>
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className={`flex flex-col ${collapsed && !isMobile ? 'pt-0' : 'pt-2'}`}>
              <nav className="space-y-0">
                {items.map((item, index) => {
                  const hasAccess = item.roles.includes(userRole) || isAdminOverrideActive();

                  if (!hasAccess) {
                    return null;
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleNavigation(item.id);
                        if (isMobile) setSidebarOpen(false);
                        setShowHeaderMenu(false);
                      }}
                      className={`w-full p-3 flex items-center outline-none rounded-none transition-colors duration-200 ${
                        collapsed && !isMobile ? 'justify-center' : 'justify-start px-3'
                      } ${
                        activePanel === item.id
                          ? 'bg-[#d4b9cc] text-[#8E1751]'
                          : 'bg-transparent hover:bg-[#e7c9de] text-[#8E1751]'
                      } ${collapsed && !isMobile && index === 0 ? 'mt-0' : ''}`}
                      title={isMobile || !collapsed ? '' : item.label}
                    >
                      <div className="w-8 h-10 flex items-center justify-center flex-shrink-0">
                        <img
                          src={item.icon}
                          alt={item.label}
                          className="w-full h-full object-contain"
style={{ filter: 'brightness(0) saturate(200%) invert(50%) sepia(100%) hue-rotate(300deg) saturate(200%) brightness(80%)' }}                        />
                      </div>
                      {(isMobile || !collapsed) && (
                        <span className="ml-3 text-sm lg:text-base">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg p-6 shadow-lg min-w-[320px] max-w-[400px]">
            <h3 className="text-lg font-bold mb-2 text-[#841c4f]">Admin Unlock</h3>
            <p className="text-sm mb-3">Enter admin credentials to access this page temporarily.</p>
            <input
              className="w-full border p-2 rounded mb-2"
              placeholder="Admin username"
              value={unlockUsername}
              onChange={(e) => setUnlockUsername(e.target.value)}
            />
            <input
              type="password"
              className="w-full border p-2 rounded mb-2"
              placeholder="Password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
            />
            {unlockError && <div className="text-red-500 mb-2 text-sm">{unlockError}</div>}
            <div className="flex gap-2 mt-2">
              <button className="px-4 py-2 bg-[#841c4f] text-white rounded" onClick={tryUnlockAsAdmin}>
                Unlock
              </button>
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowUnlockModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`fixed top-[60px] lg:top-[65px] left-0 right-0 bottom-0 overflow-auto transition-all duration-700 z-10 ${
          isMobile ? 'pl-0' : collapsed ? 'lg:pl-20' : 'lg:pl-[250px]'
        } ${blurred ? 'blur-sm' : ''} ${contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{
          backgroundColor: '#f5eef3'
        }}
      >
        <div className="w-full h-full p-0 md:p-0 lg:p-0">
          {children}
        </div>
      </div>
    </>
  );
}
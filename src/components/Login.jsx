import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase, auth, profiles } from '../supabase';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingStatus, setPendingStatus] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setPendingStatus(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPendingStatus(false);

    let loginSuccess = false;

    try {
      let loginEmail = formData.identifier.trim();
      
      // If it doesn't look like an email, assume it's a username and fetch the mapped email
      if (!loginEmail.includes('@')) {
        const { data: fetchedEmail, error: rpcError } = await supabase.rpc('get_email_by_username', {
          p_username: loginEmail
        });
        
        if (rpcError || !fetchedEmail) {
          setError('Invalid username or password.');
          setLoading(false);
          return;
        }
        loginEmail = fetchedEmail;
      }

      // 1. Authenticate with Supabase
      const { data, error } = await auth.signIn(loginEmail, formData.password);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // 2. Fetch the user's profile
        const { profile: userProfile, error: profileError } = await profiles.getOrCreate(data.user);

        if (profileError || !userProfile) {
          console.error('Profile load/create error:', profileError);
          setError('Failed to load or create user profile');
          await auth.signOut(); // Clean up if profile fails
          setLoading(false);
          return;
        }

        // Standardize strings to lowercase to prevent bypass bugs
        const status = String(userProfile.status || '').toLowerCase();
        const role = String(userProfile.role || '').toLowerCase();

        // 3. STRICT SECURITY CHECKS: Verify Approval & Active Status
        if (status === 'pending') {
          setPendingStatus(true);
          await auth.signOut(); // Immediately sign them out
          setLoading(false);
          return;
        }

        if (status === 'rejected') {
          setError('Your account registration was rejected.');
          toast.error('Your account was rejected by the administrator.');
          await auth.signOut();
          setLoading(false);
          return;
        }

        if (userProfile.is_active === false) {
          setError('Your account has been disabled.');
          toast.error('Your account is disabled. Please contact the administrator.');
          await auth.signOut();
          setLoading(false);
          return;
        }

        // 4. Success! Save to local storage
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          username: userProfile.username,
          role: role,
          status: status
        }));
        localStorage.setItem('isLoggedIn', 'true');

        toast.success('Login successful!');
        loginSuccess = true;
        
        // Let App.jsx handle the navigation
      }
    } catch (err) {
      setError('An error occurred during login');
      toast.error('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      if (!loginSuccess) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f8eef8] via-[#f0e1f3] to-[#f7f0e8] px-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#D9B5CC]/30 bg-white/95 shadow-[0_20px_60px_rgba(139,56,136,0.15)] p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#280A4F] mb-1 font-['Satoshi']">KARINEYOSA</h1>
          <p className="text-sm text-[#65366F]">What you see is what you get</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="identifier" className="block text-[#65366F] font-semibold mb-2">
              Email or Username
            </label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[#C9A8C9] bg-[#FDF6FB] px-4 py-3 text-[#4A2B4F] placeholder:text-[#A986B5] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition"
              placeholder="Enter your email or username"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-[#65366F] font-semibold mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#C9A8C9] bg-[#FDF6FB] px-4 py-3 pr-12 text-[#4A2B4F] placeholder:text-[#A986B5] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#65366F] hover:text-[#841c4f]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Pending Status Alert Indicator */}
          {pendingStatus && (
            <div className="mb-6 rounded-2xl border border-blue-300 bg-blue-50 px-4 py-4 text-sm text-blue-800 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="block font-bold text-blue-900 mb-1">Account Pending Approval</strong>
                Your account is currently pending. An administrator must approve your account before you can log in to the system. Please check back later.
              </div>
            </div>
          )}

          {/* Generic Error Box */}
          {error && !pendingStatus && (
            <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] px-5 py-3 text-[#280A4F] font-bold shadow-[0_12px_28px_rgba(209,198,243,0.28)] transition hover:shadow-[0_16px_32px_rgba(209,198,243,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="mt-4 text-right">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm font-semibold text-[#841c4f] hover:text-[#65366F]"
            >
              Forgot password?
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-[#5e3d6b]">
          <p className="text-sm">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-semibold text-[#841c4f] hover:text-[#65366F]"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
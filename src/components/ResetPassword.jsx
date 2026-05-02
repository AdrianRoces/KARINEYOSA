import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../supabase';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Toggle states for password visibility
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Check if the user is arriving from a password reset email
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // SECURE THE SYSTEM: Flag that the user is in recovery mode.
      // App.jsx will use this to trap the user on this screen and block access to the app
      localStorage.setItem('recoveryMode', 'true');
      toast.info('Secure session established. Please set your new password.', { autoClose: 5000 });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // Supabase's built-in function updates the password of the active temporary session
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        setMessage('Password updated successfully!');
        toast.success('Password updated successfully! Please log in.');
        
        // UNLOCK THE SYSTEM & FORCE RE-LOGIN
        localStorage.removeItem('recoveryMode');
        await supabase.auth.signOut();
        
        setTimeout(() => {
          navigate('/login');
          window.location.reload(); // Hard reload to clear any residual auth state
        }, 1500);
      }
    } catch (err) {
      setError('Unable to update password.');
      toast.error('Unable to update password.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    localStorage.removeItem('recoveryMode');
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f8eef8] via-[#f0e1f3] to-[#f7f0e8] px-4 fixed inset-0 z-[9999]">
      <div className="w-full max-w-md rounded-[32px] border border-[#D9B5CC]/30 bg-white/95 shadow-[0_20px_60px_rgba(139,56,136,0.15)] p-8 relative">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#280A4F] mb-1 font-['Satoshi']">Set new password</h1>
          <p className="text-sm text-[#65366F]">Enter your new password below to secure your account.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="newPassword" className="block text-[#65366F] font-semibold mb-2">
              New password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-[#C9A8C9] bg-[#FDF6FB] px-4 py-3 pr-12 text-[#4A2B4F] placeholder:text-[#A986B5] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#65366F] hover:text-[#841c4f]"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="confirmPassword" className="block text-[#65366F] font-semibold mb-2">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-[#C9A8C9] bg-[#FDF6FB] px-4 py-3 pr-12 text-[#4A2B4F] placeholder:text-[#A986B5] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#65366F] hover:text-[#841c4f]"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-2xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] px-5 py-3 text-[#280A4F] font-bold shadow-[0_12px_28px_rgba(209,198,243,0.28)] transition hover:shadow-[0_16px_32px_rgba(209,198,243,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Resetting...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-6 text-center text-[#5e3d6b] space-y-3">
          <button
            onClick={handleCancel}
            className="text-sm font-semibold text-[#841c4f] hover:text-[#65366F]"
          >
            Cancel and return to login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
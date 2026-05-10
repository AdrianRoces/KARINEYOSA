import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../supabase';
import { X } from 'lucide-react';

const ResetPasswordModal = ({ onClose, onBackToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const initializeRecoverySession = async () => {
      try {
        // First, ensure Supabase reads the recovery token from the URL
        const { data: { session }, error: urlError } = await supabase.auth.getSessionFromUrl();
        
        if (urlError) {
          console.warn('getSessionFromUrl error:', urlError?.message ?? urlError);
        }

        // Wait a bit for the session to be established
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now check if we have a valid session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error fetching recovery session:', sessionError);
          setError('Unable to verify reset session. Please try the link again.');
          setRecoveryReady(false);
          return;
        }

        if (!currentSession?.user) {
          setError('Auth session missing! Please use the password reset link from your email again.');
          setRecoveryReady(false);
          return;
        }

        localStorage.setItem('recoveryMode', 'true');
        toast.info('Secure session established. Please set your new password.', { autoClose: 5000 });
        setRecoveryReady(true);
      } catch (err) {
        console.error('Recovery initialization error:', err);
        setError('An error occurred while initializing reset password. Please try again.');
      }
    };

    initializeRecoverySession();
  }, []);

    initializeRecoverySession();
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        setError('Auth session missing! Please use the reset link again.');
        toast.error('Auth session missing!');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError(updateError.message);
        toast.error(updateError.message);
        setLoading(false);
      } else {
        setMessage('Password updated successfully!');
        toast.success('Password updated successfully! Please log in.');

        localStorage.removeItem('recoveryMode');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');

        setTimeout(async () => {
          try {
            await supabase.auth.signOut();
          } catch (signOutErr) {
            console.error('Sign out error (non-critical):', signOutErr);
          }
          onBackToLogin();
        }, 1000);
      }
    } catch (err) {
      setError('Unable to update password.');
      toast.error('Unable to update password.');
      console.error('Reset password error:', err);
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    localStorage.removeItem('recoveryMode');
    await supabase.auth.signOut();
    onBackToLogin();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={24} className="text-gray-600" />
        </button>

        {/* Modal Content */}
        <div className="p-8 pt-12">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-[#280A4F] mb-2 font-['Satoshi']">Set new password</h2>
            <p className="text-sm text-[#65366F]">Enter your new password below to secure your account.</p>
          </div>

          {!recoveryReady && error ? (
            <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label htmlFor="reset-newPassword" className="block text-[#65366F] font-semibold mb-2">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="reset-newPassword"
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
                <label htmlFor="reset-confirmPassword" className="block text-[#65366F] font-semibold mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="reset-confirmPassword"
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
                disabled={!recoveryReady || loading}
                className="w-full rounded-2xl bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] px-5 py-3 text-[#280A4F] font-bold shadow-[0_12px_28px_rgba(209,198,243,0.28)] transition hover:shadow-[0_16px_32px_rgba(209,198,243,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Resetting...' : 'Update Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-[#5e3d6b] space-y-3">
            <button
              onClick={handleCancel}
              className="text-sm font-semibold text-[#841c4f] hover:text-[#65366F] block w-full"
            >
              Cancel and return to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;

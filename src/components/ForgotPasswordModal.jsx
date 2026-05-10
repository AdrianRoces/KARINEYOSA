import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../supabase';
import { X } from 'lucide-react';

const ForgotPasswordModal = ({ onClose, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        setMessage('Password reset email sent. Please check your inbox.');
        toast.success('Password reset email sent.');
      }
    } catch (err) {
      setError('Unable to submit request.');
      toast.error('Unable to submit request.');
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
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
            <h2 className="text-3xl font-bold text-[#280A4F] mb-2 font-['Satoshi']">Forgot password</h2>
            <p className="text-sm text-[#65366F]">Enter your email address to get a reset link.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="forgot-email" className="block text-[#65366F] font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="forgot-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-[#C9A8C9] bg-[#FDF6FB] px-4 py-3 text-[#4A2B4F] placeholder:text-[#A986B5] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition"
                placeholder="e.g. user@example.com"
                required
              />
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
              {loading ? 'Sending...' : 'Send reset email'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-[#5e3d6b]">
            <button
              onClick={onBackToLogin}
              className="text-sm font-semibold text-[#841c4f] hover:text-[#65366F] block w-full"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

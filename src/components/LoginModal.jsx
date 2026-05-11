import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase, auth, profiles, APP_URL } from '../supabase';
import { X } from 'lucide-react';

const LoginModal = ({ onClose, onRegisterClick, onForgotPasswordClick }) => {
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

      const { data, error } = await auth.signIn(loginEmail, formData.password);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { profile: userProfile, error: profileError } = await profiles.getOrCreate(data.user);

        if (profileError || !userProfile) {
          console.error('Profile load/create error:', profileError);
          setError('Failed to load or create user profile');
          await auth.signOut();
          setLoading(false);
          return;
        }

        const status = String(userProfile.status || '').toLowerCase();
        const role = String(userProfile.role || '').toLowerCase();

        if (status === 'pending') {
          setPendingStatus(true);
          await auth.signOut();
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setPendingStatus(false);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: APP_URL
        }
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
        setLoading(false);
      }
    } catch (err) {
      const message = err?.message || 'Google sign in failed';
      setError(message);
      toast.error(message);
      setLoading(false);
      console.error('Google sign in error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-white/30 rounded-lg transition-colors"
        >
          <X size={24} className="text-gray-600" />
        </button>

        {/* Modal Content */}
        <div className="p-8 pt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full rounded-lg border-2 border-gray-200 bg-white px-6 py-3 text-gray-700 font-semibold shadow-sm transition hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-3 text-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.2-2.25H12v4.26h6.54c-.28 1.5-1.09 2.77-2.32 3.62v3.02h3.75c2.19-2.01 3.45-5.01 3.45-8.65z"/>
                <path fill="#34A853" d="M12 24c3.15 0 5.79-1.04 7.72-2.83l-3.75-3.02c-1.04.7-2.37 1.12-3.97 1.12-3.05 0-5.64-2.06-6.57-4.83H1.6v3.04C3.52 21.95 7.46 24 12 24z"/>
                <path fill="#FBBC05" d="M5.43 14.44c-.24-.7-.38-1.45-.38-2.22s.14-1.52.38-2.22V6.96H1.6C.57 8.63 0 10.73 0 12.99c0 2.27.57 4.37 1.6 6.03l3.83-3.58z"/>
                <path fill="#EA4335" d="M12 4.79c1.71 0 3.25.59 4.46 1.75l3.35-3.35C17.78 1.44 15.14 0 12 0 7.46 0 3.52 2.05 1.6 5.96l3.83 3.04c.93-2.77 3.52-4.83 6.57-4.83z"/>
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm text-gray-500">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div>
              <label htmlFor="login-identifier" className="block text-gray-700 font-semibold mb-2 text-sm">
                Email or Username
              </label>
              <input
                type="text"
                id="login-identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm"
                placeholder="Enter your email or username"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-gray-700 font-semibold mb-2 text-sm">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            {pendingStatus && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Your account is still waiting for admin approval. Once it is approved, you can log in.
              </div>
            )}

            {error && !pendingStatus && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] px-6 py-3 text-[#280A4F] font-bold shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 transform hover:scale-[1.01] text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-sm font-semibold text-[#65366F] hover:text-[#841c4f]"
              >
                Forgot password?
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <button
                onClick={onRegisterClick}
                className="font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

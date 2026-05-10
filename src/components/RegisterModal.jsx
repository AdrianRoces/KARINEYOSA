import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase, auth } from '../supabase';
import { X } from 'lucide-react';

const RegisterModal = ({ onClose, onLoginClick }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const passwordCriteria = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
    noSpaces: !/\s/.test(formData.password)
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const failedCriteria = Object.values(passwordCriteria).some((valid) => !valid);
      if (failedCriteria) {
        newErrors.password = 'Password must be at least 8 characters, include upper and lower case letters, a number, a special character, and contain no spaces.';
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      let isFirstAdmin = true;
      try {
        const { data: hasAdmin, error: rpcError } = await supabase.rpc('admin_exists');
        if (!rpcError && hasAdmin !== null) {
          isFirstAdmin = !hasAdmin;
        } else {
          const { data: adminCheck, error: adminCheckError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1);

          if (!adminCheckError && adminCheck && adminCheck.length > 0) {
            isFirstAdmin = false;
          }
        }
      } catch (err) {
        console.log('Admin check failed:', err);
      }

      const { data, error } = await auth.signUp(formData.email, formData.password, {
        username: formData.username
      });

      if (error) {
        setErrors({ general: error.message });
        toast.error(error.message);
        return;
      }

      if (data.user) {
        if (!data.session) {
          toast.info('Check your email to verify your account before logging in.');
          onLoginClick();
          return;
        }

        const newStatus = isFirstAdmin ? 'approved' : 'pending';

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: formData.username,
            role: isFirstAdmin ? 'admin' : 'employee',
            status: newStatus,
            is_active: true
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          setErrors({ general: 'Account created but profile setup failed. Please contact admin.' });
          toast.error('Account created but profile setup failed. Please contact admin.');
          return;
        }

        toast.success(`Registration successful! ${isFirstAdmin ? 'You are now the admin.' : 'Please check your email to confirm your account.'}`);
        onLoginClick();
      }
    } catch (err) {
      setErrors({ general: 'An error occurred during registration' });
      toast.error('An error occurred during registration');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setErrors({ general: error.message });
        toast.error(error.message);
        setLoading(false);
      }
    } catch (err) {
      const message = err?.message || 'Google sign up failed';
      setErrors({ general: message });
      toast.error(message);
      setLoading(false);
      console.error('Google sign up error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-white/30 rounded-lg transition-colors"
        >
          <X size={24} className="text-gray-600" />
        </button>

        {/* Modal Content */}
        <div className="p-6 pt-12">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600 text-sm">Join our platform today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full rounded-lg border-2 border-gray-200 bg-white px-6 py-3 text-gray-700 font-semibold shadow-sm transition hover:bg-gray-50 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-3 text-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.2-2.25H12v4.26h6.54c-.28 1.5-1.09 2.77-2.32 3.62v3.02h3.75c2.19-2.01 3.45-5.01 3.45-8.65z"/>
                <path fill="#34A853" d="M12 24c3.15 0 5.79-1.04 7.72-2.83l-3.75-3.02c-1.04.7-2.37 1.12-3.97 1.12-3.05 0-5.64-2.06-6.57-4.83H1.6v3.04C3.52 21.95 7.46 24 12 24z"/>
                <path fill="#FBBC05" d="M5.43 14.44c-.24-.7-.38-1.45-.38-2.22s.14-1.52.38-2.22V6.96H1.6C.57 8.63 0 10.73 0 12.99c0 2.27.57 4.37 1.6 6.03l3.83-3.58z"/>
                <path fill="#EA4335" d="M12 4.79c1.71 0 3.25.59 4.46 1.75l3.35-3.35C17.78 1.44 15.14 0 12 0 7.46 0 3.52 2.05 1.6 5.96l3.83 3.04c.93-2.77 3.52-4.83 6.57-4.83z"/>
              </svg>
              {loading ? 'Redirecting...' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm text-gray-500">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div>
              <label htmlFor="register-username" className="block text-gray-700 font-semibold mb-2 text-sm">
                Username
              </label>
              <input
                type="text"
                id="register-username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full rounded-lg border-2 px-4 py-3 text-gray-900 placeholder:text-gray-500 bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm ${
                  errors.username ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'
                }`}
                placeholder="Enter username"
                required
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="register-email" className="block text-gray-700 font-semibold mb-2 text-sm">
                Email
              </label>
              <input
                type="email"
                id="register-email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full rounded-lg border-2 px-4 py-3 text-gray-900 placeholder:text-gray-500 bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm ${
                  errors.email ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'
                }`}
                placeholder="Enter email"
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="register-password" className="block text-gray-700 font-semibold mb-2 text-sm">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="register-password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full rounded-lg border-2 px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-500 bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm ${
                    errors.password ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'
                  }`}
                  placeholder="Enter password"
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
              {formData.password.length > 0 && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                  <p className="mb-2 font-semibold text-gray-900">Password requirements</p>
                  <ul className="space-y-1">
                    <li className={`flex items-center gap-2 ${passwordCriteria.length ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{passwordCriteria.length ? '✓' : '○'}</span>
                      At least 8 characters
                    </li>
                    <li className={`flex items-center gap-2 ${passwordCriteria.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{passwordCriteria.uppercase ? '✓' : '○'}</span>
                      Upper and lower case
                    </li>
                    <li className={`flex items-center gap-2 ${passwordCriteria.number ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{passwordCriteria.number ? '✓' : '○'}</span>
                      At least one number
                    </li>
                    <li className={`flex items-center gap-2 ${passwordCriteria.specialChar ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{passwordCriteria.specialChar ? '✓' : '○'}</span>
                      One special character
                    </li>
                    <li className={`flex items-center gap-2 ${passwordCriteria.noSpaces ? 'text-green-600' : 'text-gray-500'}`}>
                      <span>{passwordCriteria.noSpaces ? '✓' : '○'}</span>
                      No spaces
                    </li>
                  </ul>
                </div>
              )}
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="register-confirmPassword" className="block text-gray-700 font-semibold mb-2 text-sm">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="register-confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full rounded-lg border-2 px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-500 bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm ${
                    errors.confirmPassword ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'
                  }`}
                  placeholder="Confirm password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.general && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.general}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] px-6 py-3 text-[#280A4F] font-bold shadow-[0_12px_28px_rgba(209,198,243,0.28)] transition hover:shadow-[0_16px_32px_rgba(209,198,243,0.32)] disabled:cursor-not-allowed disabled:opacity-60 text-sm"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 mb-4">
              After registration, your account will be pending approval. An administrator will review your request shortly.
            </div>
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <button
                onClick={onLoginClick}
                className="font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;

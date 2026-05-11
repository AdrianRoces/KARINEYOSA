import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase, auth, APP_URL } from '../supabase';

const Register = () => {
  const navigate = useNavigate();
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
          // Fallback if RPC doesn't exist
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

      // Sign up with Supabase Auth
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
          // Email confirmation mode: user must verify before a session exists.
          toast.info('Check your email to verify your account before logging in.');
          navigate('/login');
          return;
        }

        // FIX: Ensure status aligns with the DB check constraints ('pending' or 'approved')
        const newStatus = isFirstAdmin ? 'approved' : 'pending';

        // Create profile in profiles table only when the user has a session
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: formData.username,
            role: isFirstAdmin ? 'admin' : 'employee', // Universal default to 'employee'
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
        navigate('/login');
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
          redirectTo: APP_URL
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f8eef8] via-[#f0e1f3] to-[#f7f0e8] px-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#D9B5CC]/30 bg-white/95 shadow-[0_20px_60px_rgba(139,56,136,0.15)] p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#280A4F] mb-1 font-['Satoshi']">KARINEYOSA</h1>
          <p className="text-sm text-[#65366F]">What you see is what you get</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full mb-4 rounded-2xl border border-[#D9B5CC] bg-white px-5 py-3 text-[#202124] font-semibold shadow-sm transition hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.2-2.25H12v4.26h6.54c-.28 1.5-1.09 2.77-2.32 3.62v3.02h3.75c2.19-2.01 3.45-5.01 3.45-8.65z"/>
            <path fill="#34A853" d="M12 24c3.15 0 5.79-1.04 7.72-2.83l-3.75-3.02c-1.04.7-2.37 1.12-3.97 1.12-3.05 0-5.64-2.06-6.57-4.83H1.6v3.04C3.52 21.95 7.46 24 12 24z"/>
            <path fill="#FBBC05" d="M5.43 14.44c-.24-.7-.38-1.45-.38-2.22s.14-1.52.38-2.22V6.96H1.6C.57 8.63 0 10.73 0 12.99c0 2.27.57 4.37 1.6 6.03l3.83-3.58z"/>
            <path fill="#EA4335" d="M12 4.79c1.71 0 3.25.59 4.46 1.75l3.35-3.35C17.78 1.44 15.14 0 12 0 7.46 0 3.52 2.05 1.6 5.96l3.83 3.04c.93-2.77 3.52-4.83 6.57-4.83z"/>
          </svg>
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-[#D9B5CC]/40" />
          <span className="text-sm text-[#65366F]">or sign up with</span>
          <div className="h-px flex-1 bg-[#D9B5CC]/40" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="username" className="block text-[#65366F] font-semibold mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full rounded-2xl border px-4 py-3 text-[#4A2B4F] placeholder:text-[#A986B5] bg-[#FDF6FB] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition ${
                errors.username ? 'border-red-400' : 'border-[#C9A8C9]'
              }`}
              placeholder="Enter username"
              required
            />
            {errors.username && (
              <p className="mt-2 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="email" className="block text-[#65366F] font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full rounded-2xl border px-4 py-3 text-[#4A2B4F] placeholder:text-[#A986B5] bg-[#FDF6FB] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition ${
                errors.email ? 'border-red-400' : 'border-[#C9A8C9]'
              }`}
              placeholder="Enter email"
              required
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="mb-5">
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
                className={`w-full rounded-2xl border px-4 py-3 pr-12 text-[#4A2B4F] placeholder:text-[#A986B5] bg-[#FDF6FB] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition ${
                  errors.password ? 'border-red-400' : 'border-[#C9A8C9]'
                }`}
                placeholder="Enter password"
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
            {formData.password.length > 0 && (
              <div className="mt-4 rounded-2xl border border-[#E0D4EA] bg-[#F9F6FF] p-4 text-sm text-[#4A2B4F]">
                <p className="mb-2 font-semibold text-[#65366F]">Password requirements</p>
                <ul className="space-y-2">
                  <li className={`flex items-center gap-2 ${passwordCriteria.length ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                    <span>{passwordCriteria.length ? '✔' : '○'}</span>
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-2 ${passwordCriteria.uppercase ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                    <span>{passwordCriteria.uppercase ? '✔' : '○'}</span>
                    Upper and lower case letters
                  </li>
                  <li className={`flex items-center gap-2 ${passwordCriteria.number ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                    <span>{passwordCriteria.number ? '✔' : '○'}</span>
                    At least one number
                  </li>
                  <li className={`flex items-center gap-2 ${passwordCriteria.specialChar ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                    <span>{passwordCriteria.specialChar ? '✔' : '○'}</span>
                    At least one special character
                  </li>
                  <li className={`flex items-center gap-2 ${passwordCriteria.noSpaces ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                    <span>{passwordCriteria.noSpaces ? '✔' : '○'}</span>
                    No spaces
                  </li>
                </ul>
              </div>
            )}
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="confirmPassword" className="block text-[#65366F] font-semibold mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full rounded-2xl border px-4 py-3 pr-12 text-[#4A2B4F] placeholder:text-[#A986B5] bg-[#FDF6FB] focus:border-[#841c4f] focus:ring-2 focus:ring-[#D1C6F3]/40 outline-none transition ${
                  errors.confirmPassword ? 'border-red-400' : 'border-[#C9A8C9]'
                }`}
                placeholder="Confirm password"
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
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {errors.general && (
            <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] px-5 py-3 text-[#280A4F] font-bold shadow-[0_12px_28px_rgba(209,198,243,0.28)] transition hover:shadow-[0_16px_32px_rgba(209,198,243,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-[#5e3d6b]">
          <p className="text-sm">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-semibold text-[#841c4f] hover:text-[#65366F]"
            >
              Login here
            </button>
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-[#D1C6F3]/30 bg-[#F5F0FB] p-4 text-sm text-[#4A2B4F]">
          After registration, your account will be pending approval. An administrator will review your request shortly.
        </div>
      </div>
    </div>
  );
};

export default Register;
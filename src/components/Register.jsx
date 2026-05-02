import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase, auth } from '../supabase';

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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
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
            role: isFirstAdmin ? 'admin' : 'user',
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f8eef8] via-[#f0e1f3] to-[#f7f0e8] px-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#D9B5CC]/30 bg-white/95 shadow-[0_20px_60px_rgba(139,56,136,0.15)] p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#280A4F] mb-1 font-['Satoshi']">KARINEYOSA</h1>
          <p className="text-sm text-[#65366F]">What you see is what you get</p>
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
                placeholder="Enter password (min 6 characters)"
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
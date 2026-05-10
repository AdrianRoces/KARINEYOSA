import React, { useState } from 'react';
import { User } from 'lucide-react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import ForgotPasswordModal from './ForgotPasswordModal';
import ResetPasswordModal from './ResetPasswordModal';

const LandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  const openRegisterFromLogin = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const openLoginFromRegister = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const openForgotPasswordFromLogin = () => {
    setShowLoginModal(false);
    setShowForgotPasswordModal(true);
  };

  const openLoginFromForgotPassword = () => {
    setShowForgotPasswordModal(false);
    setShowLoginModal(true);
  };

  const openResetPasswordFromForgotPassword = () => {
    setShowForgotPasswordModal(false);
    setShowResetPasswordModal(true);
  };

  const openLoginFromResetPassword = () => {
    setShowResetPasswordModal(false);
    setShowLoginModal(true);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden animate-fadeIn">
      {/* Hero Background with Zoom Animation */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-slowZoom"
        style={{
          backgroundImage: `url(/icons/heroimage.png)`,
        }}
      />

      {/* Subtle Dark Overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

      {/* Floating Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex justify-center pt-3 md:pt-4 animate-floatNav">
        <div className="w-[96%] max-w-6xl mx-auto bg-white/95 backdrop-blur-lg rounded-full shadow-md px-7 py-3 md:px-8 md:py-3.5 flex items-center justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
          {/* Brand Logo */}
          <div className="flex-shrink-0">
            <h1
              className="text-[#3d3050] text-sm md:text-base tracking-[0.16em] font-semibold uppercase"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              KARINEYOSA
            </h1>
          </div>

          {/* Center - Empty (No nav links) */}
          <div className="flex-1" />

          {/* Right - Login Button */}
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-2 text-[#3d3050] font-medium hover:text-[#1f1727] transition-colors duration-300 cursor-pointer"
          >
            <User size={15} strokeWidth={1.7} />
            <span className="text-xs md:text-sm">LOGIN</span>
          </button>
        </div>
      </nav>

      {/* Hero Content - Centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {/* Slogan - Fades up first */}
        <h2
          className="text-white text-3xl md:text-5xl lg:text-6xl leading-tight font-light tracking-normal drop-shadow-md max-w-3xl animate-fadeUp"
          style={{ fontFamily: 'Satoshi, sans-serif', animationDelay: '0s' }}
        >
          What you see,
          <br />
          is what you get
        </h2>

        {/* CTA Button - Fades up with delay */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="mt-7 md:mt-9 px-9 py-3 border border-white text-white text-sm md:text-sm font-medium tracking-[0.18em] uppercase rounded-sm hover:bg-white hover:text-[#3d3050] transition-all duration-500 drop-shadow-lg animate-fadeUp"
          style={{ animationDelay: '0.4s' }}
        >
          Manage Inventory
        </button>
      </div>

      {/* Copyright Footer */}
      <div className="absolute left-0 right-0 bottom-8 flex justify-center px-4">
        <div className="bg-white rounded-full px-5 py-2 shadow-sm border border-white/80 max-w-max">
          <p className="text-[#2b2433] text-xs md:text-sm font-medium tracking-[0.18em] uppercase">
            © karineyosa
          </p>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onRegisterClick={openRegisterFromLogin}
          onForgotPasswordClick={openForgotPasswordFromLogin}
        />
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterModal
          onClose={() => setShowRegisterModal(false)}
          onLoginClick={openLoginFromRegister}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPasswordModal(false)}
          onBackToLogin={openLoginFromForgotPassword}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <ResetPasswordModal
          onClose={() => setShowResetPasswordModal(false)}
          onBackToLogin={openLoginFromResetPassword}
        />
      )}
    </div>
  );
};

export default LandingPage;

import React from 'react';

export default function StatCard({ value, label, subtitle, onClick, isClickable = false }) {
  return (
    <div className={`flex-1 group ${isClickable ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className={`bg-white border border-gray-300 rounded-[15px] sm:rounded-[20px] h-[120px] sm:h-[135px] flex flex-col justify-end shadow-[inset_0_4px_4px_rgba(0,0,0,0.3)] ${
        isClickable ? 'hover:shadow-[inset_0_4px_4px_rgba(0,0,0,0.4)]' : ''
      } transition-shadow duration-200`}>
        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <div className="text-[#280A4F] text-2xl sm:text-3xl md:text-4xl font-bold font-satoshi group-hover:scale-105 transition-transform duration-200 text-center leading-tight">
            {value}
          </div>
          <div className="text-[#280A4F] text-xs sm:text-sm opacity-70 mt-1 text-center">
            {subtitle || label}
          </div>
        </div>
        <div className="rounded-[15px] sm:rounded-[20px] p-2 sm:p-3 h-[45px] sm:h-[55px] flex items-center justify-center border border-gray-400" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
          <div className="text-gray-800 text-sm sm:text-base md:text-lg font-semibold text-center">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
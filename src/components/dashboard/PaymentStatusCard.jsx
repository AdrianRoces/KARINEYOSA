import React from 'react';

export default function PaymentStatusCard({ totalPaidOrders, totalPendingOrders }) {
  return (
    <div className="flex-1">
      <div className="bg-white border border-gray-300 rounded-[15px] sm:rounded-[20px] h-[120px] sm:h-[135px] flex flex-col justify-end shadow-[inset_0_4px_4px_rgba(0,0,0,0.3)]">
        <div className="flex-1 flex flex-row justify-center items-center gap-3 sm:gap-6 px-2">
          <div className="flex flex-col items-center group">
            <div className="text-green-600 text-xl sm:text-2xl md:text-3xl font-bold font-satoshi group-hover:scale-105 transition-transform duration-200">
              {totalPaidOrders || 0}
            </div>
            <div className="text-green-600 text-xs sm:text-sm font-medium">Paid</div>
          </div>
          <div className="flex flex-col items-center group">
            <div className="text-yellow-600 text-xl sm:text-2xl md:text-3xl font-bold font-satoshi group-hover:scale-105 transition-transform duration-200">
              {totalPendingOrders || 0}
            </div>
            <div className="text-yellow-600 text-xs sm:text-sm font-medium">Pending</div>
          </div>
        </div>
        <div className="rounded-[15px] sm:rounded-[20px] p-2 sm:p-3 h-[45px] sm:h-[55px] flex items-center justify-center border border-gray-400" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
          <div className="text-gray-800 text-sm sm:text-base md:text-lg font-semibold text-center">
            PAYMENT STATUS
          </div>
        </div>
      </div>
    </div>
  );
}
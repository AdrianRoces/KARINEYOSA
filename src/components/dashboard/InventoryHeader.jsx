import React from 'react';

export default function InventoryHeader({ inventoryPriceTotal, inventoryCostTotal, potentialSalesMargin, onNavigateToOrders }) {
  const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

  return (
    <div
      className="relative w-full min-h-[135px] rounded-[25px] overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
      style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
      onClick={() => onNavigateToOrders && onNavigateToOrders('orders')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_45%),linear-gradient(155deg,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="relative h-full px-4 py-5 sm:px-5 sm:py-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full">
          <div className="rounded-[20px] bg-white border border-gray-400 p-5 flex flex-col justify-center gap-2 shadow-inner shadow-black/10 w-full">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#7d4f66] font-semibold">Inventory Price</div>
            <div className="text-lg sm:text-xl font-bold text-[#4b2039]">{formatCurrency(inventoryPriceTotal)}</div>
          </div>
          <div className="rounded-[20px] bg-white border border-gray-400 p-5 flex flex-col justify-center gap-2 shadow-inner shadow-black/10 w-full">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#7d4f66] font-semibold">Inventory Cost</div>
            <div className="text-lg sm:text-xl font-bold text-[#4b2039]">{formatCurrency(inventoryCostTotal)}</div>
          </div>
          <div className="rounded-[20px] bg-white border border-gray-400 p-5 flex flex-col justify-center gap-2 shadow-inner shadow-black/10 w-full">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#7d4f66] font-semibold">Potential Margin</div>
            <div className="text-lg sm:text-xl font-bold text-[#4b2039]">{formatCurrency(potentialSalesMargin)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
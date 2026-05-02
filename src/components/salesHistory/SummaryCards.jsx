import React from 'react';

export default function SummaryCards({
  totalAmount,
  totalItems,
  averageOrderValue,
  viewPeriod,
  selectedDate,
  currentDateRange,
  margin = 0
}) {
  const getPeriodText = () => {
    if (viewPeriod === 'day') {
      return `Daily: ${selectedDate}`;
    } else if (viewPeriod === 'week') {
      return `Weekly: ${currentDateRange.start} to ${currentDateRange.end}`;
    } else {
      return `Monthly: ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-[#FFE2F0] p-6 rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)] transition-transform duration-300 hover:scale-105">
        <h3 className="text-lg font-semibold text-[#841c4f] font-['Satoshi']">Net Sales</h3>
        <p className="text-sm text-[#841c4f]">{getPeriodText()}</p>
        <p className="text-2xl font-bold text-[#841c4f] mt-2">₱{totalAmount.toLocaleString()}</p>
      </div>
      
      <div className="bg-green-100 p-6 rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)] transition-transform duration-300 hover:scale-105">
        <h3 className="text-lg font-semibold text-green-800 font-['Satoshi']">Margin</h3>
        <p className="text-sm text-green-700">{getPeriodText()}</p>
        <p className="text-2xl font-bold text-green-800 mt-2">₱{margin.toLocaleString()}</p>
      </div>
      
      <div className="bg-[#FFE2F0] p-6 rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)] transition-transform duration-300 hover:scale-105">
        <h3 className="text-lg font-semibold text-[#841c4f] font-['Satoshi']">Total Items Sold</h3>
        <p className="text-sm text-[#841c4f]">Quantity across all orders</p>
        <p className="text-2xl font-bold text-[#841c4f] mt-2">{totalItems} items</p>
      </div>
      
      <div className="bg-[#FFE2F0] p-6 rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)] transition-transform duration-300 hover:scale-105">
        <h3 className="text-lg font-semibold text-[#841c4f] font-['Satoshi']">Avg Order Value</h3>
        <p className="text-sm text-[#841c4f]">Per transaction</p>
        <p className="text-2xl font-bold text-[#841c4f] mt-2">₱{averageOrderValue.toLocaleString()}</p>
      </div>
    </div>
  );
}

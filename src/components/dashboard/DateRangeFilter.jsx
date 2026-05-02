import React, { useState } from 'react';

export default function DateRangeFilter({ selectedDateRange, onDateRangeChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const ranges = [
    { value: 'today', label: 'Today' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'lastyear', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ];

  const currentLabel = ranges.find(r => r.value === selectedDateRange)?.label || 'Select Range';

  return (
    <div className="relative font-satoshi">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#e8d6e8] text-[#280A4F] border-2 border-[#c9a8c9] rounded-lg hover:bg-[#d7bbde] active:bg-[#c3a3cf] transition-colors duration-200 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#D1C6F3]"
      >
        <span className="truncate">{currentLabel}</span>
        <span className={`transition-transform duration-200 text-xs ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-[#c9a8c9] rounded-lg shadow-lg z-50 min-w-[180px] sm:min-w-[200px] overflow-hidden">
          {ranges.map((range) => (
            <button
              key={range.value}
              onClick={() => { onDateRangeChange(range.value); setIsOpen(false); }}
              className={`w-full px-3 sm:px-4 py-3 text-left text-sm transition-all duration-200 font-satoshi ${
                selectedDateRange === range.value ? 'bg-gradient-to-r from-[#D1C6F3] to-[#E9BCAC] text-[#280A4F] font-semibold shadow-inner' : 'text-[#280A4F] hover:bg-[#f5e6f0]'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
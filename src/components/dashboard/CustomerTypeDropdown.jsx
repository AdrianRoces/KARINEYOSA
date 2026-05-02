import React, { useState } from 'react';

export default function CustomerTypeDropdown({ 
  totalCustomers = 0, newCustomers = 0, regularCustomers = 0, loyalCustomers = 0, bogusCustomers = 0, onNavigate
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('total');

  const options = [
    { value: 'total', label: 'Total Customers', count: totalCustomers },
    { value: 'new', label: 'New Customers', count: newCustomers },
    { value: 'regular', label: 'Regular Customers', count: regularCustomers },
    { value: 'loyal', label: 'Loyal Customers', count: loyalCustomers },
    { value: 'bogus', label: 'Bogus Customers', count: bogusCustomers }
  ];

  const currentOption = options.find(opt => opt.value === selectedOption);

  return (
    <div className="flex-1 group cursor-pointer" onClick={() => onNavigate && onNavigate('customers')}>
      <div className="bg-white border border-gray-300 rounded-[15px] sm:rounded-[20px] h-[120px] sm:h-[135px] flex flex-col justify-end shadow-[inset_0_4px_4px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_6px_6px_rgba(0,0,0,0.3)] transition-shadow duration-200">
        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <div className="text-[#280A4F] text-2xl sm:text-3xl md:text-4xl font-bold font-satoshi group-hover:scale-105 transition-transform duration-200 text-center leading-tight">
            {currentOption?.count || 0}
          </div>
          <div className="text-[#280A4F] text-xs sm:text-sm opacity-80 mt-1 text-center font-satoshi">
            {currentOption?.label}
          </div>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className="w-full rounded-[15px] sm:rounded-[20px] p-2 sm:p-3 h-[45px] sm:h-[55px] flex items-center justify-between px-3 sm:px-4 border-2 border-[#9c7fc5] bg-gradient-to-r from-[#D1C6F3] to-[#E9BCAC] text-[#280A4F] font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none"
          >
            <span className="truncate text-sm sm:text-base md:text-lg font-satoshi">CUSTOMER TYPE</span>
            <span className={`transition-transform duration-200 text-sm ${isOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 rounded-[10px] sm:rounded-[15px] shadow-lg z-50 overflow-hidden" style={{ borderColor: '#D1C6F3' }}>
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => { e.stopPropagation(); setSelectedOption(option.value); setIsOpen(false); }}
                  className={`w-full px-3 sm:px-4 py-3 text-left text-xs sm:text-sm md:text-base font-satoshi transition-all duration-200 ${
                    selectedOption === option.value ? 'bg-gradient-to-r from-[#D1C6F3] to-[#E9BCAC] text-[#280A4F] font-semibold shadow-inner' : 'text-[#280A4F] hover:bg-[#f5e6f0]'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="truncate">{option.label}</span>
                    <span className="font-bold ml-2">{option.count}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
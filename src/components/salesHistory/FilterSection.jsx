import React from 'react';

export default function FilterSection({
  selectedDate,
  viewPeriod,
  platformFilter,
  categoryFilter,
  searchQuery,
  filterOptions,
  onDateChange,
  onPeriodChange,
  onPlatformChange,
  onCategoryChange,
  onSearchChange
}) {
  return (
    <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] p-6 rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)] mb-6">
      <h2 className="text-lg font-semibold text-[#841c4f] mb-4 font-['Satoshi']">Filters</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <label htmlFor="datePicker" className="text-sm font-medium text-[#841c4f] mb-2">Date:</label>
          <input
            id="datePicker"
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="border border-[#65366F]/30 px-3 py-2 rounded-lg text-[#841c4f] focus:ring-2 focus:ring-[#65366F] focus:border-transparent bg-white/80 backdrop-blur-sm hover:bg-white/90"
          />
        </div>
        
        <div className="flex flex-col">
          <label htmlFor="periodSelect" className="text-sm font-medium text-[#841c4f] mb-2">View Period:</label>
          <select
            id="periodSelect"
            value={viewPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="border border-[#65366F]/30 px-3 py-2 rounded-lg text-[#841c4f] focus:ring-2 focus:ring-[#65366F] focus:border-transparent bg-white/80 backdrop-blur-sm hover:bg-white/90"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
        
        <div className="flex flex-col">
          <label htmlFor="platformSelect" className="text-sm font-medium text-[#841c4f] mb-2">Platform:</label>
          <select
            id="platformSelect"
            value={platformFilter}
            onChange={(e) => onPlatformChange(e.target.value)}
            className="border border-[#65366F]/30 px-3 py-2 rounded-lg text-[#841c4f] focus:ring-2 focus:ring-[#65366F] focus:border-transparent bg-white/80 backdrop-blur-sm hover:bg-white/90"
          >
            <option value="All">All Platforms</option>
            {filterOptions.platforms.map((platform, idx) => (
              <option key={idx} value={platform}>{platform}</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-col">
          <label htmlFor="categorySelect" className="text-sm font-medium text-[#841c4f] mb-2">Category:</label>
          <select
            id="categorySelect"
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="border border-[#65366F]/30 px-3 py-2 rounded-lg text-[#841c4f] focus:ring-2 focus:ring-[#65366F] focus:border-transparent bg-white/80 backdrop-blur-sm hover:bg-white/90"
          >
            <option value="All">All Categories</option>
            {filterOptions.categories.map((category, idx) => (
              <option key={idx} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Search Box */}
      <div className="mt-4">
        <label htmlFor="searchBox" className="text-sm font-medium text-[#841c4f] mb-2">Search:</label>
        <input
          id="searchBox"
          type="text"
          placeholder="Search by customer, product, category..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full border border-[#65366F]/30 px-3 py-2 rounded-lg text-[#841c4f] focus:ring-2 focus:ring-[#65366F] focus:border-transparent bg-white/80 backdrop-blur-sm hover:bg-white/90"
        />
      </div>
    </div>
  );
}

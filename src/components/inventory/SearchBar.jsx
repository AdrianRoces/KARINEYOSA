function SearchBar({ searchTerm, onSearchChange }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-end md:justify-center mb-8 gap-2 px-4 w-full">
      <div className="flex items-center justify-end md:justify-center w-full max-w-[380px] sm:max-w-[520px] md:max-w-[640px] ml-auto md:ml-0 gap-2">
        <input
          type="text"
          className="flex-1 h-[38px] rounded-full border border-[#65366F] px-4 pr-12 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#65366F]"
          placeholder="Search by product name..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button
          type="button"
          className="inline-flex items-center justify-center h-[38px] w-[38px] rounded-full text-gray-800 border border-gray-300 hover:opacity-80 transition"
          aria-label="Search"
          style={{ background: 'transparent' }}
        >
          <img src="icons/Search.png" alt="Search" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default SearchBar;

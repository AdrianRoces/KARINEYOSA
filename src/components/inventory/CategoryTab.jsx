function CategoryTab({ name, category, active, onClick }) {
  return (
    <div className="relative group">
      <button
        className={`tab-btn bg-transparent border-none text-gray-800 text-[13px] sm:text-[15px] min-w-[90px] max-w-[140px] px-2 text-center cursor-pointer font-['Satoshi'] ${
          active ? 'text-white' : ''
        }`}
        onClick={onClick}
      >
        {name}
      </button>
    </div>
  );
}

export default CategoryTab;

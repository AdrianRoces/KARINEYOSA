function CategoryTab({ name, category, active, onClick }) {
  return (
    <div className="relative group">
      <button
        className={`tab-btn bg-transparent border-none text-gray-800 text-[16px] w-[130px] cursor-pointer font-['Satoshi'] ${
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

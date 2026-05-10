import { useState, useEffect } from 'react';
import CategoryTab from './CategoryTab';
import { PRODUCT_CATEGORIES } from './constants';

const CATEGORY_SORT_KEY = 'categoryDisplaySortMode';
const SORT_MODES = {
  DEFAULT: 'default',
  ALPHABETICAL: 'alphabetical',
  STOCK_DESC: 'stock-desc'
};

const getStoredSortMode = () => {
  if (typeof window === 'undefined') return SORT_MODES.STOCK_DESC;
  return localStorage.getItem(CATEGORY_SORT_KEY) || SORT_MODES.STOCK_DESC;
};

const getCategoryStocks = (products) => {
  const categoryStocks = {};
  PRODUCT_CATEGORIES.forEach(cat => {
    categoryStocks[cat.value] = 0;
  });
  products.forEach(product => {
    if (categoryStocks.hasOwnProperty(product.category)) {
      categoryStocks[product.category] += product.totalStock || 0;
    }
  });
  return categoryStocks;
};

const sortCategories = (categories, products, mode) => {
  if (mode === SORT_MODES.ALPHABETICAL) {
    return [...categories].sort((a, b) => a.label.localeCompare(b.label));
  }

  if (mode === SORT_MODES.STOCK_DESC) {
    const categoryStocks = getCategoryStocks(products);
    return [...categories].sort((a, b) => {
      const stockA = categoryStocks[a.value] || 0;
      const stockB = categoryStocks[b.value] || 0;
      return stockB - stockA;
    });
  }

  return [...categories];
};

function CategoryTabs({ activeCategory, onCategoryChange, products = [] }) {
  const [sortMode, setSortMode] = useState(getStoredSortMode());
  const [sortedCategories, setSortedCategories] = useState(() => sortCategories(PRODUCT_CATEGORIES, products, getStoredSortMode()));

  useEffect(() => {
    const sorted = sortCategories(PRODUCT_CATEGORIES, products, sortMode);
    setSortedCategories(sorted);
  }, [products, sortMode]);

  useEffect(() => {
    const updateCategories = () => {
      setSortedCategories(sortCategories(PRODUCT_CATEGORIES, products, sortMode));
    };

    const updateSortMode = () => {
      setSortMode(getStoredSortMode());
    };

    window.addEventListener('productCategoriesChanged', updateCategories);
    window.addEventListener('categorySortModeChanged', updateSortMode);

    return () => {
      window.removeEventListener('productCategoriesChanged', updateCategories);
      window.removeEventListener('categorySortModeChanged', updateSortMode);
    };
  }, [products, sortMode]);

  return (
    <div className="top-0 left-0 lg:left-[80px] w-full h-[52px] sm:h-[56px] shadow-md z-10" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
      <div className="flex gap-3 sm:gap-4 h-full items-center overflow-x-auto overflow-y-hidden px-2 sm:px-4 scrollbar-hide">
        <CategoryTab
          name="ALL"
          category="all"
          active={activeCategory === 'all'}
          onClick={() => onCategoryChange('all')}
        />
        {sortedCategories.map((cat) => (
          <CategoryTab
            key={cat.value}
            name={cat.label.toUpperCase()}
            category={cat.value}
            active={activeCategory === cat.value}
            onClick={() => onCategoryChange(cat.value)}
          />
        ))}
      </div>
    </div>
  );
}

export default CategoryTabs;

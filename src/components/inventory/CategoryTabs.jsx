import { useState, useEffect } from 'react';
import CategoryTab from './CategoryTab';
import { PRODUCT_CATEGORIES } from './constants';

function CategoryTabs({ activeCategory, onCategoryChange, products = [] }) {
  const [sortedCategories, setSortedCategories] = useState(PRODUCT_CATEGORIES);

  useEffect(() => {
    // Calculate total stock for each category
    const categoryStocks = {};
    
    // Initialize all categories with 0 stock
    PRODUCT_CATEGORIES.forEach(cat => {
      categoryStocks[cat.value] = 0;
    });

    // Sum up stocks for each category
    products.forEach(product => {
      if (categoryStocks.hasOwnProperty(product.category)) {
        categoryStocks[product.category] += product.totalStock || 0;
      }
    });

    // Sort categories by stock (highest first)
    const sorted = [...PRODUCT_CATEGORIES].sort((a, b) => {
      const stockA = categoryStocks[a.value] || 0;
      const stockB = categoryStocks[b.value] || 0;
      return stockB - stockA;
    });

    setSortedCategories(sorted);
  }, [products]);

  useEffect(() => {
    const handler = () => {
      const categoryStocks = {};
      PRODUCT_CATEGORIES.forEach(cat => { categoryStocks[cat.value] = 0; });
      products.forEach(product => {
        if (categoryStocks.hasOwnProperty(product.category)) {
          categoryStocks[product.category] += product.totalStock || 0;
        }
      });
      const sorted = [...PRODUCT_CATEGORIES].sort((a, b) => {
        const stockA = categoryStocks[a.value] || 0;
        const stockB = categoryStocks[b.value] || 0;
        return stockB - stockA;
      });
      setSortedCategories(sorted);
    };

    window.addEventListener('productCategoriesChanged', handler);
    return () => window.removeEventListener('productCategoriesChanged', handler);
  }, [products]);

  return (
    <div className="top-0 left-[80px] w-full h-[65px] shadow-md z-10" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
      <div className="flex gap-5 h-full items-center overflow-x-auto overflow-y-hidden px-4 scrollbar-hide">
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

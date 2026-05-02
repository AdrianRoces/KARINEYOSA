const DEFAULT_PRODUCT_CATEGORIES = [
  { value: 'dress', label: 'Dress' },
  { value: 'demin', label: 'Demin' },
  { value: 'coords', label: 'Coords' },
  { value: 'skrit', label: 'Skrit' },
  { value: 'trousers', label: 'Trousers' },
  { value: 'casual-top', label: 'Casual Top' },
  { value: 'formal-top', label: 'Formal Top' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'bags', label: 'Bags' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'modern-filipina', label: 'Modern Filipina' },
];

export const PRODUCT_CATEGORIES = [];

try {
  const stored = typeof window !== 'undefined' && localStorage.getItem('productCategories');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length) {
      PRODUCT_CATEGORIES.push(...parsed);
    } else {
      PRODUCT_CATEGORIES.push(...DEFAULT_PRODUCT_CATEGORIES);
    }
  } else {
    PRODUCT_CATEGORIES.push(...DEFAULT_PRODUCT_CATEGORIES);
  }
} catch (e) {
  PRODUCT_CATEGORIES.push(...DEFAULT_PRODUCT_CATEGORIES);
}

export function addCategory({ value, label }) {
  if (!PRODUCT_CATEGORIES.find((c) => c.value === value)) {
    PRODUCT_CATEGORIES.push({ value, label });
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('productCategories', JSON.stringify(PRODUCT_CATEGORIES));
        try { window.dispatchEvent(new CustomEvent('productCategoriesChanged')); } catch(e) {}
      }
    } catch (e) {}
    return true;
  }
  return false;
}

export function removeCategory(value) {
  const idx = PRODUCT_CATEGORIES.findIndex((c) => c.value === value);
  if (idx !== -1) {
    PRODUCT_CATEGORIES.splice(idx, 1);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('productCategories', JSON.stringify(PRODUCT_CATEGORIES));
        try { window.dispatchEvent(new CustomEvent('productCategoriesChanged')); } catch(e) {}
      }
    } catch (e) {}
    return true;
  }
  return false;
}

export function editCategory(oldValue, newLabel) {
  const idx = PRODUCT_CATEGORIES.findIndex((c) => c.value === oldValue);
  if (idx !== -1 && newLabel.trim()) {
    PRODUCT_CATEGORIES[idx].label = newLabel.trim();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('productCategories', JSON.stringify(PRODUCT_CATEGORIES));
        try { window.dispatchEvent(new CustomEvent('productCategoriesChanged')); } catch(e) {}
      }
    } catch (e) {}
    return true;
  }
  return false;
}
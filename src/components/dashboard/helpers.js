import { PLATFORMS, PROFIT_MARGIN, TOP_PRODUCTS_LIMIT } from './constants';
import { supabase } from '../../supabase';

/**
 * Fetches all products from Supabase
 */
export const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    throw new Error('Failed to fetch products');
  }

  return data || [];
};

/**
 * Fetches all orders from Supabase
 */
export const fetchProductOrders = async (productId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('product_id', productId);
  
  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
  return data || [];
};

/**
 * Enriches orders with product information
 */
export const enrichOrdersWithProductInfo = (orders, product) => {
  return orders.map(order => ({
    ...order,
    productId: product.id,
    productName: product.name,
    productCategory: product.category,
    productPrice: product.price
  }));
};

/**
 * Counts orders by platform
 */
export const countOrdersByPlatform = (orders) => {
  const counts = {
    facebook: 0,
    instagram: 0
  };

  orders.forEach(order => {
    const platform = order.platform?.toLowerCase();
    if (platform in counts) {
      counts[platform] += 1;
    }
  });

  return counts;
};

/**
 * Calculates total stocks from products
 */
export const calculateTotalStocks = (products) => {
  return products.reduce((total, product) => {
    return total + 
      (product.sizes?.small || 0) + 
      (product.sizes?.medium || 0) + 
      (product.sizes?.large || 0);
  }, 0);
};

/**
 * Calculates stocks by platform
 */
export const calculateStocksByPlatform = (products) => {
  const stocks = {
    facebook: 0,
    instagram: 0
  };

  products.forEach(product => {
    const fbTotal = (product.sizes?.small || 0) - (product.sizes?.smallFB || 0);
    const igTotal = (product.sizes?.medium || 0) - (product.sizes?.mediumIG || 0);
    
    stocks.facebook += fbTotal;
    stocks.instagram += igTotal;
  });

  return stocks;
};

/**
 * Initializes product sales map
 */
export const initializeProductSalesMap = (products) => {
  const map = {};
  
  products.forEach(product => {
    map[product.id] = {
      id: product.id,
      name: product.name,
      category: product.category,
      units: 0,
      amount: 0
    };
  });

  return map;
};

/**
 * Initializes category sales map
 */
export const initializeCategorySales = (products) => {
  const sales = {};
  
  products.forEach(product => {
    if (!sales[product.category]) {
      sales[product.category] = 0;
    }
  });

  return sales;
};

/**
 * Updates sales data from paid orders
 */
export const updateSalesFromOrders = (
  paidOrders,
  productSalesMap,
  categorySales,
  platformSales
) => {
  paidOrders.forEach(order => {
    if (productSalesMap[order.productId]) {
      productSalesMap[order.productId].units += order.quantity;
      productSalesMap[order.productId].amount += order.totalAmount;
      
      categorySales[order.productCategory] += order.quantity;
      
      const platform = order.platform.toLowerCase();
      if (platform in platformSales) {
        platformSales[platform] += order.totalAmount;
      }
    }
  });
};

/**
 * Calculates top products from sales data
 */
export const calculateTopProducts = (productSalesMap) => {
  return Object.values(productSalesMap)
    .sort((a, b) => b.units - a.units)
    .slice(0, TOP_PRODUCTS_LIMIT);
};

/**
 * Calculates total revenue and net profit
 */
export const calculateRevenue = (paidOrders) => {
  const totalRevenue = paidOrders.reduce((total, order) => total + order.totalAmount, 0);
  const netProfit = totalRevenue * PROFIT_MARGIN;
  
  return { totalRevenue, netProfit };
};

/**
 * Transforms sales map to array format
 */
export const transformSalesToArray = (salesMap) => {
  return Object.entries(salesMap).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value
  }));
};

/**
 * Formats currency value
 */
export const formatCurrency = (value) => {
  return `₱${value.toLocaleString()}`;
};

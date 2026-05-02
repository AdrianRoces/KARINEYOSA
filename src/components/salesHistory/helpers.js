import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';

/**
 * THIS FILE CONTAINS LEGACY HELPERS. 
 * Functions are exported but may be overridden by the optimized useMemo hooks
 * inside index.jsx to prevent duplicate computations. Included for safety.
 */

export const fetchProducts = async () => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw new Error('Failed to fetch products');
  return data || [];
};

export const calculateDateRange = (date, period) => {
  const selectedDate = new Date(date);
  
  if (period === 'day') {
    return { start: date, end: date };
  }
  
  if (period === 'week') {
    const current = new Date(selectedDate);
    const first = current.getDate() - current.getDay();
    const weekStart = new Date(current.setDate(first));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    };
  }
  
  if (period === 'month') {
    return {
      start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString().split('T')[0]
    };
  }

  if (period === 'year') {
    const year = selectedDate.getFullYear();
    return {
      start: new Date(year, 0, 1).toISOString().split('T')[0],
      end: new Date(year, 11, 31).toISOString().split('T')[0]
    };
  }
  
  return { start: date, end: date };
};

export const filterTransactions = (transactions, dateRange, platformFilter, categoryFilter, searchQuery, sortConfig) => {
  let filtered = transactions.filter(txn => {
    const txnDate = new Date(txn.orderDate).toISOString().split('T')[0];
    const inDateRange = txnDate >= dateRange.start && txnDate <= dateRange.end;
    const matchesPlatform = platformFilter === 'All' || txn.platform === platformFilter;
    
    const matchesCategory = categoryFilter === 'All' || txn.items.some(item => item.productCategory === categoryFilter);
    
    const matchesSearch = 
      !searchQuery ||
      txn.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.items.some(item => 
        (item.productName || item.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.productCategory || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    return inDateRange && matchesPlatform && matchesCategory && matchesSearch;
  });

  if (sortConfig.key) {
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string') {
        return sortConfig.direction === 'ascending'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortConfig.direction === 'ascending'
        ? aValue - bValue
        : bValue - aValue;
    });
  }

  return filtered;
};

export const calculateSummary = (paidTransactions, dateRange) => {
  const totalAmount = paidTransactions.reduce((sum, txn) => sum + txn.totalAmount, 0);
  const totalItems = paidTransactions.reduce((sum, txn) => sum + txn.totalQuantity, 0);
  const averageOrderValue = paidTransactions.length > 0 ? totalAmount / paidTransactions.length : 0;

  const grossProfit = paidTransactions.reduce((sum, txn) => sum + txn.totalProfit, 0);
  const margin = grossProfit;
  const netSales = totalAmount;

  const platformSummary = {};
  const categorySummary = {};

  paidTransactions.forEach(txn => {
    platformSummary[txn.platform] = (platformSummary[txn.platform] || 0) + txn.totalAmount;
    
    txn.items.forEach(item => {
      const itemSubtotal = Number(item.total_amount) || 0; // Fixed to rely on database subtotal securely
      categorySummary[item.productCategory] = (categorySummary[item.productCategory] || 0) + itemSubtotal;
    });
  });

  const dailySales = [];
  const current = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayTxns = paidTransactions.filter(txn => new Date(txn.orderDate).toISOString().split('T')[0] === dateStr);
    dailySales.push({
      date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: dayTxns.reduce((sum, txn) => sum + txn.totalAmount, 0)
    });
    current.setDate(current.getDate() + 1);
  }

  return {
    totalAmount,
    netSales,
    totalItems,
    averageOrderValue,
    grossProfit,
    margin,
    platformSummary: Object.entries(platformSummary).map(([platform, value]) => ({ name: platform, value })),
    categorySummary: Object.entries(categorySummary).map(([category, value]) => ({ name: category, value })),
    dailySales
  };
};

export const getFilterOptions = (orders) => {
  const platforms = [...new Set(orders.map(order => order.platform))].filter(Boolean).sort();
  const categories = [...new Set(orders.map(order => order.productCategory))].filter(Boolean).sort();
  return { platforms, categories };
};

export const handleSort = (key, currentSortConfig) => {
  let direction = 'ascending';
  if (currentSortConfig.key === key && currentSortConfig.direction === 'ascending') {
    direction = 'descending';
  }
  return { key, direction };
};

export const getSortIndicator = (key, sortConfig) => {
  if (sortConfig.key !== key) return '';
  return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
};

export const exportToExcel = (data, filename, sheetName = 'Sales') => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export to Excel. Please try again.');
  }
};
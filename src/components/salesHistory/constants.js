// Supabase data is fetched directly via helpers.js
// No longer using API endpoints

// View periods
export const VIEW_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month'
};

// Platform names
export const PLATFORMS = {
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  ALL: 'All'
};

// Chart colors
export const CHART_COLORS = ['#65366F', '#841c4f', '#c45d9c', '#FFE2F0', '#ffea99', '#f9eef5'];

// Default filter state
export const DEFAULT_FILTERS = {
  selectedDate: new Date().toISOString().split('T')[0],
  viewPeriod: 'day',
  platformFilter: 'All',
  categoryFilter: 'All',
  sortConfig: { key: null, direction: 'ascending' },
  searchQuery: ''
};

// Default dashboard data
export const DEFAULT_DASHBOARD_DATA = {
  totalRevenue: 0,
  salesByPlatform: [],
  salesByCategory: []
};

// Table columns configuration
export const TABLE_COLUMNS = [
  { key: 'customerName', label: 'Customer' },
  { key: 'productName', label: 'Product' },
  { key: 'productCategory', label: 'Category' },
  { key: 'quantity', label: 'Qty' },
  { key: 'size', label: 'Size' },
  { key: 'platform', label: 'Platform' },
  { key: 'orderDate', label: 'Date' },
  { key: 'isPaid', label: 'Status' },
  { key: 'totalAmount', label: 'Amount (₱)' }
];

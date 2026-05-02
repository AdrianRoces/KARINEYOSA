import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import InventoryHeader from './InventoryHeader';
import StatCard from './StatCard';
import PaymentStatusCard from './PaymentStatusCard';
import SalesOverviewChart from './SalesOverviewChart';
import SalesByPlatformCard from './SalesByPlatformCard';
import OrderStatsDropdown from './OrderStatsDropdown';
import CustomerTypeDropdown from './CustomerTypeDropdown';
import ExpensesCard from './ExpensesCard';
import EmployeePerformance from './EmployeePerformance';

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [dashboardData, setDashboardData] = useState({
    totalStocks: 0,
    inventoryPriceTotal: 0,
    inventoryCostTotal: 0,
    potentialSalesMargin: 0,
    netSales: 0,
    margin: 0,
    totalExpenses: 0,
    profit: 0,
    totalCustomers: 0,
    newCustomers: 0,
    regularCustomers: 0,
    loyalCustomers: 0,
    bogusCustomers: 0,
    salesByCategory: [],
    salesByPlatform: [],
    topProducts: [],
    stocksByPlatform: { facebook: 0, instagram: 0 },
    ordersByPlatform: { facebook: 0, instagram: 0 },
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalPaidOrders: 0,
    totalPendingOrders: 0,
    salesTrendData: []
  });

  useEffect(() => {
    fetchProductsAndOrders();
  }, []);

  useEffect(() => {
    const handleDateRangeChange = (event) => {
      setSelectedDateRange(event.detail);
    };
    window.addEventListener('dateRangeChange', handleDateRangeChange);
    return () => window.removeEventListener('dateRangeChange', handleDateRangeChange);
  }, []);

  useEffect(() => {
    if (orders.length > 0 && products.length > 0) {
      const filteredOrders = filterOrdersByDateRange(orders, selectedDateRange);
      const fetchAndCalculate = async () => {
        try {
          const { data, error } = await supabase.from('expenses').select('amount');
          const totalExpenses = error ? 0 : (data || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
          calculateDashboardData(products, filteredOrders, customers, totalExpenses);
        } catch (error) {
          console.error('Error fetching expenses:', error);
          calculateDashboardData(products, filteredOrders, customers, 0);
        }
      };
      fetchAndCalculate();
    }
  }, [selectedDateRange, orders, products, customers]);

  const fetchProductsAndOrders = async () => {
    try {
      const [productsRes, ordersRes, customersRes, expensesRes] = await Promise.all([
        supabase.from('products').select('*, sizes(*)'),
        supabase.from('orders').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('expenses').select('amount')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (customersRes.error) throw customersRes.error;

      const productsData = productsRes.data || [];
      setProducts(productsData);

      const normalizeOrder = (o) => {
        const matchingProduct = productsData.find(p => p.id === o.product_id);
        return {
          id: o.id,
          transactionId: o.transaction_id || `single-${o.id}`, // Add transaction ID for grouping
          customer_id: o.customer_id,
          customerName: o.customer_name || '',
          quantity: Number(o.quantity || 0),
          platform: (o.platform || '').toString(),
          unit_price: Number(o.unit_price || 0),
          profit_per_unit: Number(o.profit_per_unit || 0),
          totalAmount: Number(o.total_amount || 0), // Strictly item subtotal
          totalProfit: Number(o.total_profit || 0), // Strictly item profit
          shippingFee: Number(o.shipping_fee || 0), // Kept separate and handled securely
          isPaid: o.is_paid || false,
          status: (o.status || '').toString(),
          orderDate: o.order_date,
          productId: o.product_id,
          productCategory: matchingProduct ? matchingProduct.category : 'uncategorized',
          _raw: o
        };
      };

      const allOrders = (ordersRes.data || []).map(normalizeOrder);
      setOrders(allOrders);

      const normalizeCustomer = (c) => ({
        ...c,
        firstOrderDate: c.first_order_date,
        lastOrderDate: c.last_order_date,
        finalTag: c.manual_bogus ? 'bogus' : (c.is_repeat_customer ? 'loyal' : (c.total_orders > 1 ? 'regular' : 'new'))
      });

      const allCustomers = (customersRes.data || []).map(normalizeCustomer);
      setCustomers(allCustomers);

      const totalExpenses = (expensesRes.data || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      
      const filteredOrders = filterOrdersByDateRange(allOrders, selectedDateRange);
      calculateDashboardData(productsData, filteredOrders, allCustomers, totalExpenses);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrdersByDateRange = (ordersToFilter, dateRange) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return ordersToFilter.filter(order => {
      if (!order.orderDate) return false;
      const orderDate = new Date(order.orderDate);
      const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());

      switch (dateRange) {
        case 'today': return orderDateOnly.getTime() === today.getTime();
        case 'last7days': {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return orderDateOnly >= sevenDaysAgo && orderDateOnly <= today;
        }
        case 'last30days': {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return orderDateOnly >= thirtyDaysAgo && orderDateOnly <= today;
        }
        case 'lastyear': {
          const oneYearAgo = new Date(today);
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return orderDateOnly >= oneYearAgo && orderDateOnly <= today;
        }
        case 'all':
        default: return true;
      }
    });
  };

  const filterCustomersByDateRange = (customersToFilter, dateRange) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return customersToFilter.filter(customer => {
      if (!customer.firstOrderDate) return false;
      const customerDate = new Date(customer.firstOrderDate);
      const customerDateOnly = new Date(customerDate.getFullYear(), customerDate.getMonth(), customerDate.getDate());

      switch (dateRange) {
        case 'today': return customerDateOnly.getTime() === today.getTime();
        case 'last7days': {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return customerDateOnly >= sevenDaysAgo && customerDateOnly <= today;
        }
        case 'last30days': {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return customerDateOnly >= thirtyDaysAgo && customerDateOnly <= today;
        }
        case 'lastyear': {
          const oneYearAgo = new Date(today);
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return customerDateOnly >= oneYearAgo && customerDateOnly <= today;
        }
        case 'all':
        default: return true;
      }
    });
  };

  // Helper function to extract unique transactions
  const getUniqueTransactions = (orderList) => {
    const txns = new Map();
    orderList.forEach(order => {
      if (!txns.has(order.transactionId)) {
        txns.set(order.transactionId, order);
      }
    });
    return Array.from(txns.values());
  };

  const calculateDashboardData = (products, orders, customers, totalExpenses = 0) => {
    const filteredCustomers = filterCustomersByDateRange(customers, selectedDateRange);
    
    const getProductStock = (product) => {
      if (product.sizes && product.sizes.length > 0) {
        return product.sizes[0].remaining_quantity || 0;
      }
      return 0;
    };

    const getProductPrice = (product) => Number(product.price || 0);
    const getProductCost = (product) => Number(product.actual_cost || 0);

    const totalStocks = products.reduce((total, product) => total + getProductStock(product), 0);
    const inventoryPriceTotal = products.reduce((total, product) => total + (getProductStock(product) * getProductPrice(product)), 0);
    const inventoryCostTotal = products.reduce((total, product) => total + (getProductStock(product) * getProductCost(product)), 0);
    const potentialSalesMargin = inventoryPriceTotal - inventoryCostTotal;

    // Fix: Calculate order stats based on unique transactions, not individual rows
    const uniqueOrders = getUniqueTransactions(orders);
    const totalOrders = uniqueOrders.length;
    const activeOrders = uniqueOrders.filter(o => o.status?.toLowerCase() === 'active' || o.status?.toLowerCase() === 'pending').length;
    const completedOrders = uniqueOrders.filter(o => o.status?.toLowerCase() === 'completed').length;
    const cancelledOrders = uniqueOrders.filter(o => o.status?.toLowerCase() === 'cancelled').length;
    
    const activeOrdersList = orders.filter(order => order.status?.toLowerCase() !== 'cancelled');
    const paidOrders = activeOrdersList.filter(order => order.isPaid);

    // Fix: Compute payment status strictly by unique transactions
    const uniqueActiveOrders = getUniqueTransactions(activeOrdersList);
    const totalPaidOrders = uniqueActiveOrders.filter(o => o.isPaid).length;
    const totalPendingOrders = uniqueActiveOrders.filter(o => !o.isPaid).length;

    const stocksByPlatform = { facebook: 0, instagram: 0 };
    const ordersByPlatform = { facebook: 0, instagram: 0 };
    
    // Group platform sales by unique active transactions
    uniqueActiveOrders.forEach(order => {
      if (order.platform?.toLowerCase() === 'facebook') ordersByPlatform.facebook += 1;
      if (order.platform?.toLowerCase() === 'instagram') ordersByPlatform.instagram += 1;
    });
    
    let newCustomersCount = 0;
    let regularCustomersCount = 0;
    let loyalCustomersCount = 0;
    let bogusCustomersCount = 0;
    
    filteredCustomers.forEach(customer => {
      const type = customer.finalTag;
      if (type === 'new') newCustomersCount++;
      else if (type === 'regular') regularCustomersCount++;
      else if (type === 'loyal') loyalCustomersCount++;
      else if (type === 'bogus') bogusCustomersCount++;
    });
    
    const totalLoyalCount = loyalCustomersCount + regularCustomersCount;
    const totalCustomers = filteredCustomers.length;

    const productSalesMap = {};
    const categorySales = {};
    const platformSales = { facebook: 0, instagram: 0 };

    products.forEach(product => {
      productSalesMap[product.id] = { id: product.id, name: product.name, category: product.category, units: 0, amount: 0 };
      if (!categorySales[product.category]) categorySales[product.category] = 0;
      if (product.sizes && product.sizes.length > 0) {
        stocksByPlatform.facebook += (product.sizes[0].facebook_quantity || 0);
        stocksByPlatform.instagram += (product.sizes[0].instagram_quantity || 0);
      }
    });

    paidOrders.forEach(order => {
      if (productSalesMap[order.productId]) {
        const qty = Number(order.quantity || 0);
        // Include shipping fee per row correctly for overall revenue
        const amt = Number(order.totalAmount || 0) + Number(order.shippingFee || 0); 
        
        productSalesMap[order.productId].units += qty;
        productSalesMap[order.productId].amount += amt;

        const cat = order.productCategory;
        if (cat && categorySales[cat] !== undefined) categorySales[cat] += qty;

        const platformKey = (order.platform || '').toString().toLowerCase();
        if (platformKey === 'facebook') platformSales.facebook += amt;
        if (platformKey === 'instagram') platformSales.instagram += amt;
      }
    });

    const topProducts = Object.values(productSalesMap).sort((a, b) => b.units - a.units).slice(0, 4);
    
    // Core computation logic for the cards - safely adds up item amounts + isolated shipping fees
    const netSales = paidOrders.reduce((total, order) => total + (Number(order.totalAmount) || 0) + (Number(order.shippingFee) || 0), 0);
    const totalProductProfit = paidOrders.reduce((total, order) => total + (Number(order.totalProfit) || 0), 0);
    
    // Fix: Removed shipping fees from margin and profit
    const margin = totalProductProfit;
    const profit = margin - totalExpenses;
    
    const salesTrendData = generateSalesTrendData(paidOrders);

    setDashboardData({
      totalStocks, inventoryPriceTotal, inventoryCostTotal, potentialSalesMargin,
      netSales, margin, totalExpenses, profit,
      totalCustomers, newCustomers: newCustomersCount, loyalCustomers: totalLoyalCount, 
      regularCustomers: regularCustomersCount, bogusCustomers: bogusCustomersCount,
      salesByCategory: Object.entries(categorySales).filter(([_, sales]) => sales > 0).map(([name, value]) => ({ name, value })),
      salesByPlatform: Object.entries(platformSales).filter(([_, sales]) => sales > 0).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })),
      topProducts, stocksByPlatform, ordersByPlatform,
      totalOrders, activeOrders, completedOrders, cancelledOrders, totalPaidOrders, totalPendingOrders, salesTrendData
    });
  };

  const generateSalesTrendData = (orders) => {
    const trendMap = {};
    orders.forEach((order) => {
      if (!order.orderDate) return;
      const orderDate = new Date(order.orderDate);
      const weekStartDate = new Date(orderDate);
      weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
      const weekKey = `Week of ${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      if (!trendMap[weekKey]) trendMap[weekKey] = { sales: 0, revenue: 0, profit: 0, date: weekStartDate.getTime() };
      
      trendMap[weekKey].sales += order.quantity || 0;
      // Re-add isolated shipping back for proper trend charts for revenue
      trendMap[weekKey].revenue += (Number(order.totalAmount) || 0) + (Number(order.shippingFee) || 0);
      
      // Keep shipping fee strictly out of profit trends
      trendMap[weekKey].profit += Number(order.totalProfit || 0); 
    });
    
    return Object.entries(trendMap).sort(([, a], [, b]) => a.date - b.date).map(([name, data]) => ({
      name, sales: data.sales, Revenue: Math.round(data.revenue), Profit: Math.round(data.profit)
    }));
  };

  const handleNavigate = (section) => {
    window.dispatchEvent(new CustomEvent('navigateToSection', { detail: section }));
  };

  if (loading) {
    return (
      <div className="mt-1 p-4 font-satoshi overflow-x-hidden flex items-center justify-center min-h-screen">
        <div className="text-center text-xl text-[#280A4F]">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full font-satoshi bg-gradient-to-br from-[#faf8fc] to-[#f5f0f8] overflow-auto">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 mb-6 lg:mb-8">
          <div className="col-span-1 lg:col-span-3 w-full">
            <InventoryHeader
              inventoryPriceTotal={dashboardData.inventoryPriceTotal}
              inventoryCostTotal={dashboardData.inventoryCostTotal}
              potentialSalesMargin={dashboardData.potentialSalesMargin}
              onNavigateToOrders={handleNavigate}
            />
          </div>
          <div className="col-span-1 lg:col-span-1 w-full">
            <OrderStatsDropdown
              totalOrders={dashboardData.totalOrders}
              activeOrders={dashboardData.activeOrders}
              completedOrders={dashboardData.completedOrders}
              cancelledOrders={dashboardData.cancelledOrders}
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 w-full mb-6 lg:mb-8">
          <PaymentStatusCard totalPaidOrders={dashboardData.totalPaidOrders} totalPendingOrders={dashboardData.totalPendingOrders} />
          <StatCard value={`₱${dashboardData.netSales.toLocaleString()}`} label="NET SALES" />
          <StatCard value={`₱${Math.round(dashboardData.margin).toLocaleString()}`} label="MARGIN" />
          <StatCard value={`₱${Math.round(dashboardData.profit).toLocaleString()}`} label="PROFIT" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full mb-6 xl:mb-8">
          <div className="flex flex-col gap-4 xl:gap-4 xl:col-span-1">
            <CustomerTypeDropdown
              totalCustomers={dashboardData.totalCustomers}
              newCustomers={dashboardData.newCustomers}
              regularCustomers={dashboardData.regularCustomers}
              loyalCustomers={dashboardData.loyalCustomers}
              bogusCustomers={dashboardData.bogusCustomers}
              onNavigate={handleNavigate}
            />
            <ExpensesCard />
            <SalesByPlatformCard salesByPlatform={dashboardData.salesByPlatform} />
          </div>
          <div className="xl:col-span-2 h-full">
            <SalesOverviewChart
              salesByCategory={dashboardData.salesByCategory}
              topProducts={dashboardData.topProducts}
              salesTrendData={dashboardData.salesTrendData}
            />
          </div>
        </div>

        <div className="mt-6 lg:mt-8 w-full">
          <EmployeePerformance />
        </div>
      </div>
    </div>
  );
}
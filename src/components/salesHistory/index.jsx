import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { Doughnut } from 'react-chartjs-2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import FilterSection from './FilterSection';
import SummaryCards from './SummaryCards';
import AnalyticsSection from './AnalyticsSection';
import TransactionDetailsDialog from './TransactionDetailsDialog';
import OrdersTable from './OrdersTable';

ChartJS.register(ArcElement, ChartTooltip, ChartLegend, ChartDataLabels);

const calculateDateRange = (date, period) => {
  const selectedDate = new Date(date);
  if (period === 'day') return { start: date, end: date };
  if (period === 'week') {
    const current = new Date(selectedDate);
    const weekStart = new Date(current.setDate(current.getDate() - current.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] };
  }
  if (period === 'month') {
    return {
      start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString().split('T')[0]
    };
  }
  if (period === 'year') {
    const year = selectedDate.getFullYear();
    return { start: new Date(year, 0, 1).toISOString().split('T')[0], end: new Date(year, 11, 31).toISOString().split('T')[0] };
  }
  return { start: date, end: date };
};

export default function SalesHistoryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewPeriod, setViewPeriod] = useState('day');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: productsData } = await supabase.from('products').select('*');
      const { data: customersData } = await supabase.from('customers').select('*');

      const productsMap = {};
      const customersMap = {};

      (productsData || []).forEach(p => {
        productsMap[p.id] = p;
      });
      (customersData || []).forEach(c => {
        customersMap[c.id] = c;
      });

      const enrichedOrders = (allOrders || []).map(order => {
        const product = productsMap[order.product_id];
        const customer = customersMap[order.customer_id];
        
        const isRepeat = customer?.is_repeat_customer;
        const manualBogus = customer?.manual_bogus;

        return {
          id: order.id,
          transactionId: order.transaction_id || `txn-${order.id}`,
          customer_id: order.customer_id,
          customer_name: order.customer_name || customer?.name || 'Unknown',
          customerTag: manualBogus ? 'Bogus' : (isRepeat ? 'Loyal' : 'New'),
          product_id: order.product_id,
          productName: product?.name || order.product_name || 'Unknown',
          productCategory: product?.category || 'Unknown',
          quantity: Number(order.quantity || 0),
          unit_price: Number(order.unit_price || 0),
          total_amount: Number(order.total_amount || 0),
          total_profit: Number(order.total_profit || 0),
          shipping_fee: Number(order.shipping_fee || 0),
          platform: (order.platform || '').toLowerCase(),
          is_paid: order.is_paid || false,
          status: order.status || 'Active',
          order_date: order.order_date,
          employee_name: order.employee_name || '—',
          contact_number: order.contact_number,
          address: order.address,
          payment_method: order.payment_method,
          shipping_method: order.shipping_method,
          cancellation_reason: order.cancellation_reason
        };
      });

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentDateRange = useMemo(() => calculateDateRange(selectedDate, viewPeriod), [selectedDate, viewPeriod]);

  // Group items by transaction ID with proper net sales and margin calculations
  const allGroupedTransactions = useMemo(() => {
    const transactionMap = new Map();

    orders.forEach(order => {
      const txnId = order.transactionId;
      if (!transactionMap.has(txnId)) {
        transactionMap.set(txnId, {
          transactionId: txnId,
          customerName: order.customer_name || 'Unknown',
          customerTag: order.customerTag,
          employeeName: order.employee_name || '—',
          platform: order.platform || '—',
          orderDate: order.order_date,
          isPaid: order.is_paid,
          status: order.status || 'Active',
          shippingFee: 0,
          itemsSubtotal: 0, 
          totalProfit: 0, 
          totalQuantity: 0, 
          items: []
        });
      }

      const transaction = transactionMap.get(txnId);
      const itemQty = Number(order.quantity) || 0;
      const itemSubtotal = Number(order.total_amount) || 0;
      const itemProfit = Number(order.total_profit) || 0;
      const shippingFee = Number(order.shipping_fee) || 0;

      // Take the highest shipping fee from all items in the transaction
      transaction.shippingFee = Math.max(transaction.shippingFee, shippingFee);

      transaction.items.push(order);
      transaction.totalQuantity += itemQty;
      transaction.itemsSubtotal += itemSubtotal;
      transaction.totalProfit += itemProfit;
    });

    // Final calculations - Net Sales = itemsSubtotal + shippingFee
    const grouped = Array.from(transactionMap.values());
    grouped.forEach(txn => {
      txn.totalAmount = txn.itemsSubtotal + txn.shippingFee;
    });

    return grouped;
  }, [orders]);

  const filteredTransactions = useMemo(() => {
    let filtered = allGroupedTransactions.filter(txn => {
      const txnDate = new Date(txn.orderDate).toISOString().split('T')[0];
      const inDateRange = txnDate >= currentDateRange.start && txnDate <= currentDateRange.end;
      const matchesPlatform = platformFilter === 'All' || txn.platform === platformFilter;
      const matchesCategory = categoryFilter === 'All' || txn.items.some(item => item.productCategory === categoryFilter);
      const matchesSearch = !searchQuery || txn.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || txn.items.some(item => (item.productName || '').toLowerCase().includes(searchQuery.toLowerCase()));
      return inDateRange && matchesPlatform && matchesCategory && matchesSearch;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (typeof a[sortConfig.key] === 'string') {
          return sortConfig.direction === 'ascending' ? a[sortConfig.key].localeCompare(b[sortConfig.key]) : b[sortConfig.key].localeCompare(a[sortConfig.key]);
        }
        return sortConfig.direction === 'ascending' ? a[sortConfig.key] - b[sortConfig.key] : b[sortConfig.key] - a[sortConfig.key];
      });
    }
    return filtered;
  }, [allGroupedTransactions, currentDateRange, platformFilter, categoryFilter, searchQuery, sortConfig]);

  const activeFilteredTransactions = useMemo(() => filteredTransactions.filter(txn => txn.status !== 'Cancelled'), [filteredTransactions]);
  const paidFilteredTransactions = useMemo(() => activeFilteredTransactions.filter(txn => txn.isPaid), [activeFilteredTransactions]);

  const { totalAmount, totalItems, averageOrderValue, margin, platformSummary, categorySummary, dailySales } = useMemo(() => {
    const amt = paidFilteredTransactions.reduce((sum, txn) => sum + txn.totalAmount, 0);
    const plat = {}; const cat = {};
    
    paidFilteredTransactions.forEach(txn => {
      plat[txn.platform] = (plat[txn.platform] || 0) + txn.totalAmount;
      txn.items.forEach(item => { 
        cat[item.productCategory] = (cat[item.productCategory] || 0) + (Number(item.total_amount) || 0); 
      });
    });
    
    const daily = [];
    let cur = new Date(currentDateRange.start);
    const end = new Date(currentDateRange.end);
    while (cur <= end) {
      const dStr = cur.toISOString().split('T')[0];
      const dayTxns = paidFilteredTransactions.filter(txn => new Date(txn.orderDate).toISOString().split('T')[0] === dStr);
      daily.push({ date: new Date(dStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), amount: dayTxns.reduce((s, t) => s + t.totalAmount, 0) });
      cur.setDate(cur.getDate() + 1);
    }
    
    return {
      totalAmount: amt,
      totalItems: paidFilteredTransactions.reduce((sum, txn) => sum + txn.totalQuantity, 0),
      averageOrderValue: paidFilteredTransactions.length > 0 ? amt / paidFilteredTransactions.length : 0,
      margin: paidFilteredTransactions.reduce((sum, txn) => sum + txn.totalProfit, 0),
      platformSummary: Object.entries(plat).map(([n, v]) => ({ name: n, value: v })),
      categorySummary: Object.entries(cat).map(([n, v]) => ({ name: n, value: v })),
      dailySales: daily
    };
  }, [paidFilteredTransactions, currentDateRange]);

  const filterOptions = useMemo(() => {
    const plats = [...new Set(orders.map(o => o.platform))].filter(Boolean).sort();
    const cats = [...new Set(orders.map(o => o.productCategory))].filter(Boolean).sort();
    return { platforms: plats, categories: cats };
  }, [orders]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleExportPeriod = async () => {
    const XLSX = await import('xlsx').catch(() => null);
    if (!XLSX) { alert("XLSX library not loaded. Please install it or use the standard application environment."); return; }

    const exportData = [];
    let tAmt = 0; let tProf = 0; let tShip = 0;
    
    paidFilteredTransactions.forEach(txn => {
      txn.items.forEach((item, index) => {
        // Isolate shipping fee to the first row of the transaction so it doesn't duplicate
        const ship = index === 0 ? txn.shippingFee : 0; 
        const rowNetSales = (Number(item.total_amount) || 0) + ship; 
        
        exportData.push({
          TransactionID: txn.transactionId, 
          Customer: txn.customerName, 
          Type: txn.customerTag,
          Product: item.productName, 
          Category: item.productCategory, 
          Quantity: item.quantity,
          Platform: txn.platform, 
          Date: new Date(txn.orderDate).toLocaleDateString(),
          PaymentStatus: 'Paid', 
          OrderStatus: txn.status,
          Amount: rowNetSales, 
          Profit: Number(item.total_profit) || 0, 
          Shipping: ship, 
          Employee: txn.employeeName
        });
        
        tAmt += rowNetSales; 
        tProf += (Number(item.total_profit) || 0); 
        tShip += ship;
      });
    });

    exportData.push({ TransactionID: 'TOTAL', Amount: tAmt, Profit: tProf, Shipping: tShip });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, `Karineyosa_Sales_${viewPeriod}_${selectedDate}.xlsx`);
  };

  if (loading) return <div className="mt-1 p-4 font-satoshi overflow-x-hidden min-h-screen"><div className="text-center py-8 text-[#280A4F]">Loading sales data...</div></div>;

  return (
    <div className="mt-1 p-4 sm:p-6 lg:p-8 font-satoshi overflow-x-hidden bg-gradient-to-br from-[#faf8fc] to-[#f5f0f8] min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-[#841c4f]">Sales History</h1>
          <button onClick={() => setShowAnalytics(p => !p)} className="px-4 py-2 bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] text-[#280A4F] rounded-lg shadow-md transition-all">
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </button>
        </div>
        
        <FilterSection selectedDate={selectedDate} viewPeriod={viewPeriod} platformFilter={platformFilter} categoryFilter={categoryFilter} searchQuery={searchQuery} filterOptions={filterOptions} onDateChange={setSelectedDate} onPeriodChange={setViewPeriod} onPlatformChange={setPlatformFilter} onCategoryChange={setCategoryFilter} onSearchChange={setSearchQuery} />
        
        <SummaryCards totalAmount={totalAmount} totalItems={totalItems} averageOrderValue={averageOrderValue} margin={margin} viewPeriod={viewPeriod} selectedDate={selectedDate} currentDateRange={currentDateRange} />

        {showAnalytics && <AnalyticsSection platformSummary={platformSummary} categorySummary={categorySummary} dailySales={dailySales} viewPeriod={viewPeriod} />}

        <div className="flex flex-wrap gap-4 mb-6">
          <button onClick={handleExportPeriod} className="px-6 py-3 bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] text-[#280A4F] rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center flex-1">
            Export {viewPeriod} to Excel
          </button>
        </div>

        <OrdersTable 
          transactions={activeFilteredTransactions} 
          sortConfig={sortConfig} 
          onSort={handleSort} 
          onViewTransaction={setSelectedTransaction} 
        />

        {selectedTransaction && <TransactionDetailsDialog transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />}
      </div>
    </div>
  );
}
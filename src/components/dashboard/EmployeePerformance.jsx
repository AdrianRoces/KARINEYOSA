import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function EmployeePerformance() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'totalProfit', direction: 'descending' });
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchEmployeePerformance();
    }
  }, [startDate, endDate]);

  const fetchEmployeePerformance = async () => {
    setLoading(true);
    try {
      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('employee_name, quantity, total_amount, total_profit, shipping_fee, transaction_id, id')
        .gte('order_date', startIso)
        .lte('order_date', endIso)
        .neq('status', 'Cancelled');

      if (error) throw error;

      const employeeMap = {};
      const globalTxnSet = new Set();
      
      let totalQuantity = 0;
      let totalRevenue = 0;
      let totalProfit = 0;

      orders?.forEach(order => {
        const username = order.employee_name || 'Unknown';
        if (!employeeMap[username]) {
          employeeMap[username] = { 
            employeeName: username, 
            totalQuantitySold: 0, 
            totalRevenue: 0, 
            totalProfit: 0,
            txns: new Set()
          };
        }
        
        const txnId = order.transaction_id || `single-${order.id}`;
        
        const rowRevenue = Number(order.total_amount || 0) + Number(order.shipping_fee || 0);
        // Fix: Removed shipping fee from Profit securely
        const rowProfit = Number(order.total_profit || 0); 

        // Track unique transaction ID for precise order counts
        employeeMap[username].txns.add(txnId);
        
        employeeMap[username].totalQuantitySold += Number(order.quantity || 0);
        employeeMap[username].totalRevenue += rowRevenue;
        employeeMap[username].totalProfit += rowProfit;

        globalTxnSet.add(txnId);
        totalQuantity += Number(order.quantity || 0);
        totalRevenue += rowRevenue;
        totalProfit += rowProfit;
      });

      const totalOrders = globalTxnSet.size;

      const employeesArray = Object.values(employeeMap).map(e => {
        const empOrders = e.txns.size; // Get accurate grouped transaction count
        return {
          employeeName: e.employeeName,
          totalOrders: empOrders,
          totalQuantitySold: e.totalQuantitySold,
          totalRevenue: e.totalRevenue,
          totalProfit: e.totalProfit,
          avgOrderValue: empOrders > 0 ? e.totalRevenue / empOrders : 0,
          profitMargin: e.totalRevenue > 0 ? ((e.totalProfit / e.totalRevenue) * 100).toFixed(1) : 0
        };
      });

      setEmployees(employeesArray);
      setSummary({ totalEmployees: employeesArray.length, totalOrders, totalQuantity, totalRevenue, totalProfit });
    } catch (error) {
      console.error('Error fetching employee performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (typeof aValue === 'number') {
      return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
    }
    return sortConfig.direction === 'ascending' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
  });

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  return (
    <div className="bg-white rounded-[10px] sm:rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)] p-3 sm:p-4 md:p-6">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#841c4f] mb-4 sm:mb-6">Employee Performance Dashboard</h2>

      <div className="bg-[#FFE2F0] rounded-[8px] sm:rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-[#841c4f]/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#841c4f] mb-1 sm:mb-2">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 rounded border border-[#841c4f]/20 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#841c4f] mb-1 sm:mb-2">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 rounded border border-[#841c4f]/20 text-sm" />
          </div>
          <button onClick={() => {
            const today = new Date();
            setEndDate(today.toISOString().split('T')[0]);
            today.setDate(today.getDate() - 30);
            setStartDate(today.toISOString().split('T')[0]);
          }} className="px-3 sm:px-4 py-2 bg-[#841c4f] text-white rounded font-semibold hover:bg-[#a82e62] transition-colors text-sm">
            Reset (Last 30 Days)
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <div className="text-xs sm:text-sm text-blue-700 font-semibold mb-1">Total Revenue</div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900">₱{summary.totalRevenue?.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
            <div className="text-xs sm:text-sm text-green-700 font-semibold mb-1">Total Profit</div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-900">₱{summary.totalProfit?.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
            <div className="text-xs sm:text-sm text-purple-700 font-semibold mb-1">Total Orders</div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900">{summary.totalOrders}</div>
          </div>
          <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-3 sm:p-4 rounded-lg border border-amber-200">
            <div className="text-xs sm:text-sm text-amber-700 font-semibold mb-1">Total Quantity</div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-900">{summary.totalQuantity} units</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-hide rounded-[8px] sm:rounded-lg border border-[#841c4f]/20">
        {loading ? (
          <div className="p-6 sm:p-8 text-center text-[#841c4f]">Loading employee data...</div>
        ) : sortedEmployees.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-[#841c4f]">No employee data for the selected period</div>
        ) : (
          <table className="w-full bg-white">
            <thead className="text-gray-800 sticky top-0" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
              <tr>
                <th className="p-2 sm:p-3 text-left border-b border-[#841c4f]/30">
                  <button onClick={() => handleSort('employeeName')} className="font-semibold hover:opacity-80 flex items-center gap-1 text-xs sm:text-sm">
                    Employee Name {getSortIndicator('employeeName')}
                  </button>
                </th>
                <th className="p-2 sm:p-3 text-center border-b border-[#841c4f]/30">
                  <button onClick={() => handleSort('totalOrders')} className="font-semibold hover:opacity-80 flex items-center justify-center gap-1 w-full text-xs sm:text-sm">
                    Orders {getSortIndicator('totalOrders')}
                  </button>
                </th>
                <th className="p-2 sm:p-3 text-center border-b border-[#841c4f]/30 hidden sm:table-cell">
                  <button onClick={() => handleSort('totalQuantitySold')} className="font-semibold hover:opacity-80 flex items-center justify-center gap-1 w-full text-xs sm:text-sm">
                    Qty Sold {getSortIndicator('totalQuantitySold')}
                  </button>
                </th>
                <th className="p-2 sm:p-3 text-center border-b border-[#841c4f]/30">
                  <button onClick={() => handleSort('totalRevenue')} className="font-semibold hover:opacity-80 flex items-center justify-center gap-1 w-full text-xs sm:text-sm">
                    Revenue {getSortIndicator('totalRevenue')}
                  </button>
                </th>
                <th className="p-2 sm:p-3 text-center border-b border-[#841c4f]/30">
                  <button onClick={() => handleSort('totalProfit')} className="font-semibold hover:opacity-80 flex items-center justify-center gap-1 w-full text-xs sm:text-sm">
                    Profit {getSortIndicator('totalProfit')}
                  </button>
                </th>
                <th className="p-2 sm:p-3 text-center border-b border-[#841c4f]/30 hidden lg:table-cell">
                  <button onClick={() => handleSort('profitMargin')} className="font-semibold hover:opacity-80 flex items-center justify-center gap-1 w-full text-xs sm:text-sm">
                    Margin % {getSortIndicator('profitMargin')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((employee, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f9eef5]'} hover:bg-[#FFE2F0]/50 transition-colors border-b border-[#841c4f]/10`}>
                  <td className="p-2 sm:p-3 text-left font-semibold text-[#841c4f] text-xs sm:text-sm">{employee.employeeName}</td>
                  <td className="p-2 sm:p-3 text-center text-xs sm:text-sm"><span className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">{employee.totalOrders}</span></td>
                  <td className="p-2 sm:p-3 text-center text-xs sm:text-sm hidden sm:table-cell">{employee.totalQuantitySold} units</td>
                  <td className="p-2 sm:p-3 text-center font-semibold text-[#841c4f] text-xs sm:text-sm">₱{employee.totalRevenue.toLocaleString()}</td>
                  <td className="p-2 sm:p-3 text-center font-bold text-green-700 text-xs sm:text-sm">₱{employee.totalProfit.toLocaleString()}</td>
                  <td className="p-2 sm:p-3 text-center font-semibold hidden lg:table-cell">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                      employee.profitMargin >= 20 ? 'bg-green-200 text-green-800' :
                      employee.profitMargin >= 10 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {employee.profitMargin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
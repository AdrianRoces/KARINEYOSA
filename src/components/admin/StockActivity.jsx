import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

export default function StockActivity() {
  const [activeTab, setActiveTab] = useState('stock');
  const [stockActivity, setStockActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const { data: stockData, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .order('date_added', { ascending: false });

      if (error) throw error;

      if (stockData) {
        setStockActivity(stockData.map(s => ({
          id: s.id,
          productId: s.product_id,
          productName: s.product_name,
          quantityAdded: s.quantity_added,
          dateAdded: s.date_added,
          note: s.note,
          username: s.username
        })));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteStockActivity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this stock activity?')) {
      return;
    }

    try {
      const { error } = await supabase.from('stock_transactions').delete().eq('id', id);
      if (error) throw error;
      
      fetchStockData();
      alert('Stock activity deleted successfully');
    } catch (err) {
      console.error('Error deleting stock activity:', err);
      alert('Error deleting stock activity');
    }
  };

  if (loading) return <div className="p-6 text-[#841c4f]">Loading activity data...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-[#841c4f] font-['Satoshi']">Activities</h1>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#841c4f]/20">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'stock'
                ? 'text-[#841c4f] border-b-2 border-[#841c4f]'
                : 'text-[#841c4f]/60 hover:text-[#841c4f]'
            }`}
          >
            📦 Stock Activity
          </button>
        </div>

        {/* Stock Activity Tab */}
        {activeTab === 'stock' && (
          <div className="w-full">
            <h2 className="text-xl font-bold text-[#841c4f] mb-4">Stock Activity Log</h2>
            <div className="overflow-x-auto rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)]">
              <table className="w-full bg-white border-collapse">
                <thead className="bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] text-[#280A4F] sticky top-0">
                  <tr>
                    <th className="p-3 text-center border-b border-[#65366F]/30 whitespace-nowrap">
                      <div className="font-semibold text-xs sm:text-sm">Date</div>
                    </th>
                    <th className="p-3 text-center border-b border-[#841c4f]/30 whitespace-nowrap">
                      <div className="font-semibold text-xs sm:text-sm">Product</div>
                    </th>
                    <th className="p-3 text-center border-b border-[#841c4f]/30 whitespace-nowrap">
                      <div className="font-semibold text-xs sm:text-sm">Quantity</div>
                    </th>
                    <th className="p-3 text-center border-b border-[#841c4f]/30 whitespace-nowrap">
                      <div className="font-semibold text-xs sm:text-sm">Username</div>
                    </th>
                    <th className="p-3 text-center border-b border-[#841c4f]/30 whitespace-nowrap">
                      <div className="font-semibold text-xs sm:text-sm">Note</div>
                    </th>
                    <th className="p-3 text-center border-b border-[#841c4f]/30 whitespace-nowrap">
                      <div className="font-semibold text-xs sm:text-sm">Actions</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stockActivity.length > 0 ? (
                    stockActivity.map((a, idx) => (
                      <tr
                        key={a.id || idx}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f9eef5]'} hover:bg-[#FFE2F0]/50 transition-colors border-b border-[#841c4f]/10`}
                      >
                        <td className="p-3 text-center text-xs sm:text-sm">
                          {new Date(a.dateAdded).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-3 text-center text-xs sm:text-sm font-medium text-[#841c4f]">{a.productName}</td>
                        <td className="p-3 text-center text-xs sm:text-sm font-semibold text-[#65366F]">{a.quantityAdded}</td>
                        <td className="p-3 text-center text-xs sm:text-sm text-[#841c4f]">{a.username || 'Unknown'}</td>
                        <td className="p-3 text-center text-xs sm:text-sm text-gray-700">{a.note || '-'}</td>
                        <td className="p-3 text-center text-xs sm:text-sm">
                          <button
                            onClick={() => deleteStockActivity(a.id)}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-[#841c4f] text-sm">
                        No stock activity found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {stockActivity.length > 0 && (
              <div className="mt-2 text-xs sm:text-sm text-[#841c4f] text-center">
                Total entries: {stockActivity.length}
              </div>
            )}
          </div>
        )}
          </div>
    </div>
  );
}
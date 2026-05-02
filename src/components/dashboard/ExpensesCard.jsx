import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function ExpensesCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
      setTotalExpenses((data || []).reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0));
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  return (
    <>
      <div className="flex-1 group cursor-pointer" onClick={() => setShowDialog(true)}>
        <div className="bg-white border border-gray-300 rounded-[15px] sm:rounded-[20px] h-[120px] sm:h-[135px] flex flex-col justify-end shadow-[inset_0_4px_4px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_4px_4px_rgba(0,0,0,0.4)] transition-shadow duration-200">
          <div className="flex-1 flex flex-col items-center justify-center px-2">
            <div className="text-[#280A4F] text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-satoshi group-hover:scale-105 transition-transform duration-200 text-center leading-tight">
              ₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[#280A4F] text-xs sm:text-sm opacity-70 mt-1 text-center">Total Expenses</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className="w-full rounded-[15px] sm:rounded-[20px] p-2 sm:p-3 h-[45px] sm:h-[55px] flex items-center justify-between px-3 sm:px-4 hover:opacity-80 transition-colors duration-200 border border-gray-400"
            style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
          >
            <span className="text-gray-800 text-sm sm:text-base md:text-lg font-semibold truncate">EXPENSES</span>
            <span className={`text-gray-800 transition-transform duration-200 text-sm ${isOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 rounded-[10px] sm:rounded-[15px] shadow-lg z-50 max-h-64 overflow-y-auto" style={{ borderColor: '#D1C6F3' }}>
              <div className="p-2 sm:p-3 border-b" style={{ borderColor: 'rgba(209, 198, 243, 0.2)' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDialog(true); setIsOpen(false); }}
                  className="w-full px-3 sm:px-4 py-2 text-gray-800 rounded text-xs sm:text-sm font-semibold hover:opacity-80 transition-colors"
                  style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
                >
                  + Add Expense
                </button>
              </div>
              {expenses.length === 0 ? (
                <div className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm text-[#280A4F]/60">No expenses yet</div>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="px-3 sm:px-4 py-2 sm:py-3 border-b last:border-b-0 text-xs sm:text-sm" style={{ borderColor: 'rgba(209, 198, 243, 0.1)' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#280A4F] truncate">{expense.name}</div>
                        {expense.description && <div className="text-xs text-[#280A4F]/60 mt-1 line-clamp-2">{expense.description}</div>}
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <div className="font-bold text-[#280A4F]">₱{parseFloat(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showDialog && (
        <ExpensesDialog 
          onClose={() => { setShowDialog(false); fetchExpenses(); }}
          expenses={expenses}
          onExpensesUpdated={fetchExpenses}
        />
      )}
    </>
  );
}

function ExpensesDialog({ onClose, expenses, onExpensesUpdated }) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', amount: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.amount) return alert('Please fill in name and amount');
    
    setLoading(true);
    try {
      if (editingId) {
        await supabase.from('expenses').update({
          name: formData.name,
          amount: parseFloat(formData.amount),
          description: formData.description,
          updated_date: new Date().toISOString()
        }).eq('id', editingId);
      } else {
        await supabase.from('expenses').insert({
          name: formData.name,
          amount: parseFloat(formData.amount),
          description: formData.description
        });
      }
      setFormData({ name: '', amount: '', description: '' });
      setEditingId(null);
      onExpensesUpdated();
    } catch (error) {
      alert('Error saving expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setLoading(true);
    try {
      await supabase.from('expenses').delete().eq('id', id);
      onExpensesUpdated();
    } catch (error) {
      alert('Error deleting expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-[#280A4F] mb-6">Manage Expenses</h2>
        <div className="bg-[#f5e6f0] rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-[#280A4F] mb-4">{editingId ? 'Edit Expense' : 'Add New Expense'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded border border-[#280A4F]/20 focus:outline-none"
              placeholder="Expense Name (e.g., Office Supplies)" required
            />
            <input
              type="number" step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-2 rounded border border-[#280A4F]/20 focus:outline-none"
              placeholder="Amount (₱)" required
            />
            <textarea
              value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 rounded border border-[#280A4F]/20 focus:outline-none"
              placeholder="Description (Optional)" rows="2"
            />
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="flex-1 text-gray-800 px-4 py-2 rounded font-semibold hover:opacity-80 transition-colors disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
                {loading ? 'Processing...' : (editingId ? 'Update' : 'Add')}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', amount: '', description: '' }); }} className="px-4 py-2 rounded border border-[#280A4F]/20 text-[#280A4F] font-semibold hover:bg-[#f5e6f0] transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#280A4F] mb-4">Expense List</h3>
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-white rounded-lg p-4 border border-[#280A4F]/10 flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="font-semibold text-[#280A4F]">{expense.name}</div>
                {expense.description && <div className="text-sm text-[#280A4F]/60">{expense.description}</div>}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-[#280A4F]">₱{parseFloat(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="text-xs text-[#280A4F]/60">{new Date(expense.created_date).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(expense.id); setFormData({ name: expense.name, amount: expense.amount, description: expense.description || '' }); }} className="px-3 py-1 text-sm text-gray-800 rounded bg-gray-200">Edit</button>
                  <button onClick={() => handleDelete(expense.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6 pt-6 border-t border-[#280A4F]/10">
          <button onClick={onClose} className="px-4 py-2 rounded border border-[#280A4F]/20 text-[#280A4F] font-semibold hover:bg-[#f5e6f0]">Close</button>
        </div>
      </div>
    </div>
  );
}
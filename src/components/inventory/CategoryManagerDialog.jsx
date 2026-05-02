import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { PRODUCT_CATEGORIES, addCategory, removeCategory, editCategory } from './constants';
import { supabase } from '../../supabase';

export default function CategoryManagerDialog({ onClose, products = [], fetchProducts }) {
  const [categories, setCategories] = useState([...PRODUCT_CATEGORIES]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingValue, setEditingValue] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    setCategories([...PRODUCT_CATEGORIES]);
  }, []);

  const handleAdd = () => {
    const raw = newCategoryName.trim();
    if (!raw) {
      toast.error('Category name cannot be empty', { autoClose: 2000, theme: 'colored' });
      return;
    }
    const value = raw.toLowerCase().replace(/\s+/g, '-');
    const label = raw.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    const added = addCategory({ value, label });
    if (added) {
      setCategories([...PRODUCT_CATEGORIES]);
      setNewCategoryName('');
      toast.success(`✅ Category ${label} added`, { autoClose: 1800, theme: 'colored' });
    } else {
      toast.info('Category already exists', { autoClose: 1600, theme: 'colored' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    const removed = removeCategory(deleteTarget);
    if (removed) {
      try {
        const affected = products.filter(p => p.category === deleteTarget);
        if (affected.length > 0) {
          const updatePromises = affected.map(prod =>
            supabase.from('products').update({ category: 'uncategorized' }).eq('id', prod.id)
          );
          await Promise.all(updatePromises);
        }
      } catch (e) {
        console.error('Failed to update products category on backend:', e);
      }

      setCategories([...PRODUCT_CATEGORIES]);
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      toast.success('✅ Category deleted. Affected products set to "uncategorized".', { autoClose: 2500, theme: 'colored' });
      if (typeof fetchProducts === 'function') await fetchProducts();
    } else {
      toast.error('Failed to delete category', { autoClose: 2000, theme: 'colored' });
    }
  };

  const handleEditStart = (cat) => {
    setEditingValue(cat.value);
    setEditingLabel(cat.label);
  };

  const handleEditSave = () => {
    if (!editingLabel.trim()) {
      toast.error('Category name cannot be empty', { autoClose: 2000, theme: 'colored' });
      return;
    }
    const edited = editCategory(editingValue, editingLabel);
    if (edited) {
      setCategories([...PRODUCT_CATEGORIES]);
      setEditingValue(null);
      setEditingLabel('');
      toast.success('✅ Category updated', { autoClose: 1800, theme: 'colored' });
    } else {
      toast.error('Failed to edit category', { autoClose: 2000, theme: 'colored' });
    }
  };

  const handleEditCancel = () => {
    setEditingValue(null);
    setEditingLabel('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[520px] bg-white rounded-lg p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#841c4f]">Manage Categories</h3>
          <button onClick={onClose} className="text-gray-600">✕</button>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">New Category</label>
          <div className="flex gap-2">
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 px-3 py-2 border rounded" placeholder="e.g., Party Dress" />
            <button onClick={handleAdd} className="px-4 py-2 bg-[#841c4f] text-white rounded">Add</button>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto border-t pt-3">
          {categories.map((cat) => (
            <div key={cat.value} className="flex justify-between items-center py-2 border-b last:border-b-0">
              {editingValue === cat.value ? (
                <div className="flex-1 flex gap-2 items-center">
                  <input
                    type="text"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    autoFocus
                  />
                  <button onClick={handleEditSave} className="px-2 py-1 bg-green-500 text-white text-xs rounded">Save</button>
                  <button onClick={handleEditCancel} className="px-2 py-1 bg-gray-300 text-gray-800 text-xs rounded">Cancel</button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="font-semibold">{cat.label}</div>
                    <div className="text-xs text-gray-500">{cat.value}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditStart(cat)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Edit</button>
                    <button onClick={() => { setDeleteTarget(cat.value); setShowDeleteDialog(true); }} className="px-3 py-1 bg-red-500 text-white rounded text-sm">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <DeleteConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}
          onConfirm={handleDeleteConfirm}
          title="Delete Category"
          message={`Are you sure you want to delete this category? Products with this category will be set to "uncategorized". This will NOT delete transaction data.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
}
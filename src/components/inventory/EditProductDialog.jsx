import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { PRODUCT_CATEGORIES } from './constants';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { supabase } from '../../supabase';

function EditProductDialog({ product, onClose, fetchProducts, userRole = 'User' }) {
  const [formData, setFormData] = useState({
    name: product.name,
    variantName: product.variantName || product.variant_name || '',
    category: product.category,
    image: null,
    sellingPrice: product.price,
    actualCost: product.actualCost || product.actual_cost || 0,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockNote, setStockNote] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const isEmployee = String(userRole || '').toLowerCase() === 'employee';

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    const username = userInfo.Username || userInfo.username || userInfo.name || 'Unknown User';
    setCurrentUser(username);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEmployee) return;

    try {
      let imageUrl = product.imagePath || product.image_path || null;

      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(`products/${fileName}`, formData.image);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(`products/${fileName}`);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('products').update({
        name: formData.name,
        variant_name: formData.variantName,
        category: formData.category,
        price: parseFloat(formData.sellingPrice),
        actual_cost: parseFloat(formData.actualCost),
        image_path: imageUrl
      }).eq('id', product.id);

      if (error) throw error;

      await fetchProducts();
      onClose();

      toast.success('✅ Product updated successfully!', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
        style: { backgroundColor: '#4CAF50' },
      });
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(`❌ ${error.message}`, {
        position: 'top-right',
        autoClose: 5000,
        theme: 'colored',
        style: { backgroundColor: '#f44336' },
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', product.id);

      if (error) throw error;

      await fetchProducts();
      onClose();

      toast.success('🗑️ Product deleted successfully!', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
        style: { backgroundColor: '#4CAF50' },
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(`❌ ${error.message}`, {
        position: 'top-right',
        autoClose: 5000,
        theme: 'colored',
        style: { backgroundColor: '#f44336' },
      });
    }
  };

  const handleStockUpdate = async (action) => {
    const quantity = parseInt(stockQuantity, 10);
    if (!quantity || quantity <= 0) {
      toast.error('Quantity must be greater than 0', { position: 'top-right', autoClose: 3000, theme: 'colored' });
      return;
    }

    if (!stockNote.trim()) {
      toast.error('A note is required for stock adjustments', { position: 'top-right', autoClose: 3000, theme: 'colored' });
      return;
    }

    try {
      // Get the size record for this product
      const { data: sizeData, error: sizeSelectError } = await supabase
        .from('sizes')
        .select('*')
        .eq('product_id', product.id)
        .single();
      
      if (sizeSelectError) {
        // If no size record exists, create one
        const { error: createError } = await supabase.from('sizes').insert({
          product_id: product.id,
          name: 'default',
          quantity: quantity,
          total_quantity: quantity,
          remaining_quantity: quantity,
          facebook_quantity: 0,
          instagram_quantity: 0
        });
        if (createError) throw createError;
      } else {
        // Update existing size record
        const currentRemaining = sizeData.remaining_quantity || 0;
        const currentTotal = sizeData.total_quantity || 0;
        
        const newRemaining = action === 'add' ? currentRemaining + quantity : currentRemaining - quantity;
        const newTotal = action === 'add' ? currentTotal + quantity : currentTotal - quantity;

        const { error: updateError } = await supabase.from('sizes')
          .update({
            remaining_quantity: newRemaining,
            total_quantity: newTotal,
            quantity: newRemaining
          })
          .eq('id', sizeData.id);

        if (updateError) throw updateError;
      }

      const { error: insertError } = await supabase.from('stock_transactions').insert({
        product_id: product.id,
        product_name: product.name,
        quantity_added: action === 'add' ? quantity : -quantity,
        note: stockNote,
        username: currentUser
      });

      if (insertError) throw insertError;

      await fetchProducts();
      setStockQuantity(1);
      setStockNote('');
      toast.success(
        action === 'add' ? '✅ Stock successfully added!' : '✅ Stock successfully deducted!',
        { position: 'top-right', autoClose: 3000, theme: 'colored', style: { backgroundColor: '#4CAF50' } }
      );
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(`❌ ${error.message}`, { position: 'top-right', autoClose: 5000, theme: 'colored' });
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-8 w-[600px] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#841c4f]">
              {isEmployee ? 'Manage Stock' : 'Edit Product'}
            </h2>
            {isEmployee && (
              <p className="text-sm text-gray-700 mt-1">Adjust product stock quantities</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#841c4f] text-3xl hover:text-red-600 font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-[28px] bg-[#fff5e6] p-4 border border-[#841c4f]/15 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-[#841c4f]">Manage Stock</div>
                <div className="text-sm text-gray-600 mt-1">Adjust quantity with a note to preserve transaction history.</div>
              </div>
              {currentUser && (
                <div className="text-sm text-[#841c4f] font-semibold">By: {currentUser}</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="block text-[#841c4f] font-semibold mb-2 text-sm">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[#841c4f] font-semibold mb-2 text-sm">Note *</label>
                <input
                  type="text"
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                  placeholder="Reason for stock update"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                type="button"
                onClick={() => handleStockUpdate('add')}
                className="flex-1 px-4 py-3 bg-[#841c4f] hover:bg-[#621c3f] text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
              >
                <span className="text-white text-xl font-bold">+</span>
                <span>Add Stock</span>
              </button>
              <button
                type="button"
                onClick={() => handleStockUpdate('deduct')}
                className="flex-1 px-4 py-3 bg-[#f44336] hover:bg-[#c0392b] text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
              >
                <span className="text-white text-xl font-bold">-</span>
                <span>Deduct Stock</span>
              </button>
            </div>
          </div>

          {!isEmployee && (
            <>
              <h3 className="text-lg font-bold text-[#841c4f] mt-8">Product Information</h3>

              <div>
                <label className="block text-[#841c4f] font-semibold mb-2">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#841c4f] font-semibold mb-2">Variant (Optional)</label>
                  <input
                    type="text"
                    name="variantName"
                    value={formData.variantName}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                    placeholder="e.g., Red, Blue"
                  />
                </div>
                <div>
                  <label className="block text-[#841c4f] font-semibold mb-2">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                    required
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#841c4f] font-semibold mb-2 text-sm">Selling Price (₱) *</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                    min="0.01"
                    step="0.01"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">Price shown to customers</p>
                </div>
                <div>
                  <label className="block text-[#841c4f] font-semibold mb-2 text-sm">Actual Cost (₱) *</label>
                  <input
                    type="number"
                    name="actualCost"
                    value={formData.actualCost}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                    min="0"
                    step="0.01"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">Cost to owner</p>
                </div>
              </div>

              <div>
                <label className="block text-[#841c4f] font-semibold mb-2">Product Image</label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="product-image-upload"
                    className="flex items-center gap-2 cursor-pointer px-4 py-3 bg-white/90 border-2 border-[#d2679f]/30 rounded-lg hover:bg-[#ffe2f0] transition"
                  >
                    <img src="/icons/addimage.png" alt="Add" className="w-5 h-5" />
                    <span className="text-[#841c4f] font-semibold text-sm">Change Image</span>
                    <input
                      id="product-image-upload"
                      type="file"
                      onChange={(e) =>
                        setFormData({ ...formData, image: e.target.files[0] })
                      }
                      className="hidden"
                      accept="image/*"
                    />
                  </label>
                  {formData.image && (
                    <span className="text-sm text-gray-700 font-semibold truncate max-w-[200px]">
                      ✓ {formData.image.name}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {isEmployee ? (
            <div className="flex justify-end gap-2 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg transition"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition"
              >
                Delete
              </button>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#841c4f] hover:bg-[#621c3f] text-white font-bold rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </form>

        <DeleteConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            handleDelete();
            setShowDeleteConfirm(false);
          }}
        />
      </div>
    </div>
  );
}

export default EditProductDialog;
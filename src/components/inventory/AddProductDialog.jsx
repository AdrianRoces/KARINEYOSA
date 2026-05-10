import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ModalPortal from './ModalPortal';
import { PRODUCT_CATEGORIES } from './constants';
import { supabase } from '../../supabase';

function AddProductDialog({ onClose, fetchProducts }) {
  const [formData, setFormData] = useState({
    name: '',
    variantName: '',
    category: '',
    totalStock: 0,
    sellingPrice: '',
    actualCost: '',
    image: null,
  });

  const [currentUser, setCurrentUser] = useState('Unknown User');

  // Fetch the current logged-in user to log who added the initial stock
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userInfo.Username || userInfo.username || userInfo.name || 'Unknown User');
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('❌ Product name is required', { autoClose: 3000, theme: 'colored' });
      return;
    }

    if (!formData.category) {
      toast.error('❌ Category is required', { autoClose: 3000, theme: 'colored' });
      return;
    }

    if (formData.totalStock <= 0) {
      toast.error('❌ Total stock must be greater than 0', { autoClose: 3000, theme: 'colored' });
      return;
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      toast.error('❌ Selling price must be greater than 0', { autoClose: 3000, theme: 'colored' });
      return;
    }

    if (!formData.actualCost || parseFloat(formData.actualCost) < 0) {
      toast.error('❌ Actual cost must be 0 or greater', { autoClose: 3000, theme: 'colored' });
      return;
    }

    if (parseFloat(formData.actualCost) >= parseFloat(formData.sellingPrice)) {
      toast.error('❌ Selling price must be greater than actual cost', { autoClose: 3000, theme: 'colored' });
      return;
    }

    try {
      let imageUrl = null;

      // Upload image to Supabase Storage if one exists
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(`products/${fileName}`, formData.image);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(`products/${fileName}`);
          
        imageUrl = urlData.publicUrl;
      }

      // Insert product into Supabase (only fields that exist in schema)
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          variant_name: formData.variantName,
          category: formData.category,
          price: parseFloat(formData.sellingPrice),
          actual_cost: parseFloat(formData.actualCost),
          image_path: imageUrl
        })
        .select();

      if (productError) {
        throw new Error(productError.message);
      }

      if (!productData || productData.length === 0) {
        throw new Error('Failed to create product');
      }

      const productId = productData[0].id;
      const initialStock = parseInt(formData.totalStock, 10);

      // Create size entry for stock tracking
      if (initialStock > 0) {
        const { error: sizeError } = await supabase
          .from('sizes')
          .insert({
            product_id: productId,
            name: 'default',
            quantity: initialStock,
            total_quantity: initialStock,
            remaining_quantity: initialStock,
            facebook_quantity: 0,
            instagram_quantity: 0
          });

        if (sizeError) {
          console.error('Warning: Could not create size entry:', sizeError);
        }

        // Create initial stock activity log
        const { error: stockTxError } = await supabase
          .from('stock_transactions')
          .insert({
            product_id: productId,
            product_name: formData.name,
            quantity_added: initialStock,
            note: 'Initial stock upon creation',
            username: currentUser
          });

        if (stockTxError) {
          console.error('Warning: Could not log initial stock transaction:', stockTxError);
        }
      }

      await fetchProducts();
      setFormData({
        name: '',
        variantName: '',
        category: '',
        totalStock: 0,
        sellingPrice: '',
        actualCost: '',
        image: null,
      });
      onClose();

      toast.success('🎉 Product added successfully!', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
        style: { backgroundColor: '#4CAF50' },
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(`❌ ${error.message}`, {
        position: 'top-right',
        autoClose: 5000,
        theme: 'colored',
        style: { backgroundColor: '#f44336' },
      });
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 overflow-y-auto" onClick={onClose}>
        <div 
          className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[28px] bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
        <button
          onClick={onClose}
          className="close-button absolute top-4 right-4 text-[#841c4f] text-3xl font-bold z-10 hover:text-red-600"
        >
          ×
        </button>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-[#841c4f] mb-6">Add New Product</h2>

          {/* Product Name */}
          <div>
            <label className="block text-[#841c4f] font-semibold mb-2">Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
              placeholder="e.g., Dress, Shirt, Pants"
              required
            />
          </div>

          {/* Two Column Row: Variant & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#841c4f] font-semibold mb-2">Variant (Optional)</label>
              <input
                type="text"
                name="variantName"
                value={formData.variantName}
                onChange={handleInputChange}
                className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                placeholder="e.g., Red, Blue, Small"
              />
              <p className="text-xs text-gray-600 mt-1">Format: Color/Size</p>
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
                <option value="">Select a category</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Two Column Row: Stock, Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#841c4f] font-semibold mb-2">Total Stock *</label>
              <input
                type="number"
                name="totalStock"
                value={formData.totalStock}
                onChange={handleInputChange}
                className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                min="1"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-[#841c4f] font-semibold mb-2">Selling Price (₱) *</label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleInputChange}
                className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-600 mt-1">Price shown to customers</p>
            </div>
          </div>

          {/* Actual Cost */}
          <div>
            <label className="block text-[#841c4f] font-semibold mb-2">Actual Cost (₱) *</label>
            <input
              type="number"
              name="actualCost"
              value={formData.actualCost}
              onChange={handleInputChange}
              className="w-full p-3 rounded border-2 border-[#d2679f]/30 focus:border-[#841c4f] focus:outline-none bg-white/90"
              min="0"
              step="0.01"
              placeholder="0.00"
              required
            />
            <p className="text-xs text-gray-600 mt-1">Actual cost to owner (Profit = Selling Price - Actual Cost)</p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-[#841c4f] font-semibold mb-2">Product Image</label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="product-image-upload"
                className="flex items-center gap-2 cursor-pointer px-4 py-3 bg-white/90 border-2 border-[#d2679f]/30 rounded-lg hover:bg-[#ffe2f0] transition"
              >
                <img src="/icons/addimage.png" alt="Add" className="w-5 h-5" />
                <span className="text-[#841c4f] font-semibold text-sm">Choose Image</span>
                <input
                  id="product-image-upload"
                  type="file"
                  onChange={handleImageChange}
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#ffea99] hover:bg-[#f0dc8e] text-[#841c4f] font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              ADD PRODUCT
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
  );
}

export default AddProductDialog;
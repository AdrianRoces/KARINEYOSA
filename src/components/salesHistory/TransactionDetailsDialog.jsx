import React, { useEffect, useRef } from 'react';
import ModalPortal from '../inventory/ModalPortal';

export default function TransactionDetailsDialog({ transaction, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!transaction) return null;

  const items = Array.isArray(transaction.items) ? transaction.items : [];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={(event) => {
          if (dialogRef.current && !dialogRef.current.contains(event.target)) {
            onClose();
          }
        }}
      >
      <div
        ref={dialogRef}
        className="w-full max-w-[920px] max-h-[92vh] overflow-y-auto bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-3xl p-6 shadow-2xl border border-[#d2679f]/30"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-[#841c4f]">Transaction Details</h2>
            <p className="text-sm text-[#5e3d6b] mt-1">Transaction ID: {transaction.transactionId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#841c4f] hover:text-red-600 text-3xl font-bold transition"
            aria-label="Close transaction details"
          >
            ✕
          </button>
        </div>

        <div className="bg-white/90 rounded-2xl border border-[#d2679f]/30 p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 font-semibold">Customer</p>
              <p className="text-lg font-bold text-[#841c4f]">{transaction.customerName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">Order Date</p>
              <p className="text-lg font-bold text-[#841c4f]">{transaction.orderDate ? new Date(transaction.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">Employee</p>
              <p className="text-lg font-bold text-[#841c4f]">{transaction.employeeName || '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 rounded-2xl border border-[#d2679f]/30 p-4 mb-5">
          <h3 className="text-lg font-bold text-[#841c4f] mb-3">Items in Transaction</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#d2679f]/20 text-[#841c4f]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Product</th>
                  <th className="px-3 py-2 text-center font-semibold">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                  <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const itemPrice = Number(item.unit_price) || 0;
                  const itemQty = Number(item.quantity) || 0;
                  const itemSubtotal = Number(item.total_amount) || 0;
                  
                  return (
                    <tr key={index} className="border-b border-[#d2679f]/20">
                      <td className="px-3 py-2">{item.productName || item.product_name || 'Unknown'}</td>
                      <td className="px-3 py-2 text-center">{itemQty}</td>
                      <td className="px-3 py-2 text-right">₱{itemPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-[#841c4f]">₱{itemSubtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/90 rounded-2xl border border-[#d2679f]/30 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-sm text-gray-600 space-y-2 border-r border-gray-300 pr-4">
               <div className="flex justify-between">
                 <span className="font-semibold">Platform:</span>
                 <span className="capitalize">{transaction.platform}</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-semibold">Payment Status:</span>
                 <span className="capitalize">{transaction.isPaid ? 'Paid' : 'Pending'}</span>
               </div>
            </div>

            <div className="text-sm text-[#841c4f] space-y-2 pl-4">
              <div className="flex justify-between">
                <span className="font-semibold">Items Subtotal</span>
                <span>₱{(transaction.itemsSubtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Shipping Fee</span>
                <span>₱{(transaction.shippingFee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-[#d2679f]/30">
                <span>Total Amount</span>
                <span>₱{(transaction.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-[#d2679f]/30 flex justify-end text-sm text-green-700">
            <span className="font-semibold">Total Margin:</span>
            <span className="ml-2 font-bold">₱{(transaction.totalProfit || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  </ModalPortal>
  );
}
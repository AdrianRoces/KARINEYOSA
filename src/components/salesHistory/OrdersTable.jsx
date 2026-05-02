import React from 'react';

export default function OrdersTable({
  transactions,
  sortConfig,
  onSort,
  onViewTransaction
}) {
  const enhancedColumns = [
    { key: 'customerName', label: 'Customer' },
    { key: 'customerTag', label: 'Type' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'totalQuantity', label: 'Quantity' },
    { key: 'platform', label: 'Platform' },
    { key: 'orderDate', label: 'Date' },
    { key: 'isPaid', label: 'Payment Status' },
    { key: 'status', label: 'Order Status' },
    { key: 'action', label: 'Action', sortable: false },
    { key: 'totalAmount', label: 'Net Sales' },
    { key: 'totalProfit', label: 'Margin' }
  ];

  const tableTotals = transactions.reduce((totals, transaction) => {
    const amount = Number(transaction.totalAmount) || 0;
    const margin = Number(transaction.totalProfit) || 0;
    return {
      netSales: totals.netSales + amount,
      margin: totals.margin + margin,
    };
  }, { netSales: 0, margin: 0 });

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-xl shadow-[0_4px_8px_rgba(101,54,111,0.2)]">
        <table className="w-full min-w-[1024px] bg-white border-collapse table-auto">
          <thead className="bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] text-[#280A4F] sticky top-0 z-20">
            <tr>
              {enhancedColumns.map(column => (
                <th key={column.key} className="p-3 text-center border-b border-[#65366F]/30 whitespace-nowrap text-[11px] sm:text-sm">
                  {column.sortable === false ? (
                    <span className="font-semibold">{column.label}</span>
                  ) : (
                    <button
                      className="font-semibold flex items-center justify-center gap-1 w-full hover:opacity-80"
                      onClick={() => onSort(column.key)}
                    >
                      {column.label}
                      {sortConfig.key === column.key && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? (
              transactions.map((transaction, idx) => {
                const customerType = transaction.customerTag;
                const amount = Number(transaction.totalAmount) || 0;
                const margin = Number(transaction.totalProfit) || 0;

                return (
                  <tr
                    key={transaction.transactionId || idx}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f9eef5]'} hover:bg-[#FFE2F0]/50 transition-colors border-b border-[#841c4f]/10`}
                  >
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap">{transaction.customerName || '—'}</td>
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap">{customerType}</td>
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap">{transaction.employeeName || '—'}</td>
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap">{transaction.totalQuantity}</td>
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap capitalize">{transaction.platform || '—'}</td>
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap">
                      {transaction.orderDate ? new Date(transaction.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded inline-block ${
                        transaction.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded inline-block ${
                        transaction.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                        transaction.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {transaction.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-[11px] sm:text-sm whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewTransaction(transaction)}
                        className="px-3 py-1 bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] text-[#280A4F] rounded-lg text-xs sm:text-sm hover:opacity-90 transition"
                      >
                        View Details
                      </button>
                    </td>
                    <td className="p-3 text-right text-[11px] sm:text-sm font-semibold text-[#841c4f] whitespace-nowrap">₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-[11px] sm:text-sm font-semibold text-green-700 whitespace-nowrap">₱{margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={enhancedColumns.length} className="p-8 text-center text-[#841c4f] text-sm">
                  No sales data found for the selected criteria
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-[#FFE2F0] text-[#841c4f] font-bold border-t-2 border-[#841c4f]/30">
            <tr>
              <td colSpan={enhancedColumns.length - 2} className="p-3 text-right text-sm">
                Total Net Sales / Margin:
              </td>
              <td className="p-3 text-right text-sm font-semibold text-[#841c4f]">₱{tableTotals.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="p-3 text-right text-sm font-semibold text-green-700">₱{tableTotals.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-4 text-xs sm:text-sm text-[#841c4f]">
        Showing {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} for the selected period
      </div>
    </div>
  );
}
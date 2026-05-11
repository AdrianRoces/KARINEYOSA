import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabase';

// Hook for live-updating time display
function useTimeAgo(iso) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const diff = Date.now() - new Date(iso).getTime();
      const sec = Math.floor(diff / 1000);
      
      if (sec < 60) {
        setDisplay(`${sec}s ago`);
      } else {
        const min = Math.floor(sec / 60);
        if (min < 60) {
          setDisplay(`${min}m ago`);
        } else {
          const hr = Math.floor(min / 60);
          if (hr < 24) {
            setDisplay(`${hr}h ago`);
          } else {
            const days = Math.floor(hr / 24);
            if (days < 365) {
              setDisplay(`${days}d ago`);
            } else {
              const years = Math.floor(days / 365);
              setDisplay(`${years}y ago`);
            }
          }
        }
      }
    };

    updateTime();
    // Update every minute to keep display accurate
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [iso]);

  return display;
}

export default function NotificationsDrawer() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const [useFallbackIcon, setUseFallbackIcon] = useState(false);

  const [storedNotifications, setStoredNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notifications') || '[]'); } catch (e) { return []; }
  });

  const [deletedIds, setDeletedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('deletedNotifications') || '[]'); } catch (e) { return []; }
  });

  const [customerStatusMap, setCustomerStatusMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customerStatusMap') || '{}'); } catch (e) { return {}; }
  });
  
  const [seenTxnIds, setSeenTxnIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seenTxnIds') || '{}'); } catch (e) { return {}; }
  });
  
  const [notificationsInitialized, setNotificationsInitialized] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notificationsInitialized') || 'false'); } catch (e) { return false; }
  });

  const unreadCount = storedNotifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchAndMergeNotifications();
    const onFocus = () => fetchAndMergeNotifications();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(fetchAndMergeNotifications, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Esc') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const saveToLocalStorage = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error(e); }
  };

  const mergeGeneratedNotifications = (generated, currentDeletedIds) => {
    if (generated.length === 0) return;
    
    const storedMap = new Map(storedNotifications.map(n => [n.id, n]));
    const nextStored = [...storedNotifications];

    generated.forEach(g => {
      // Check against current deleted IDs to prevent re-showing dismissed notifications
      if (currentDeletedIds.includes(g.id)) return;
      const existing = storedMap.get(g.id);
      if (existing) {
        existing.message = g.message;
        existing.timestamp = g.timestamp;
        existing.category = g.category;
      } else {
        const newNote = { ...g, read: false };
        nextStored.push(newNote);
        storedMap.set(g.id, newNote);
      }
    });

    nextStored.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setStoredNotifications(nextStored);
    saveToLocalStorage('notifications', nextStored);
  };

  const fetchAndMergeNotifications = async () => {
    try {
      // Load current deleted IDs from localStorage to avoid closure stale state issue
      const currentDeletedIds = (() => {
        try { return JSON.parse(localStorage.getItem('deletedNotifications') || '[]'); } catch (e) { return []; }
      })();

      const [productsResp, ordersResp, customersResp] = await Promise.all([
        supabase.from('products').select('*, sizes(remaining_quantity)'),
        supabase.from('orders').select('*'),
        supabase.from('customers').select('*')
      ]);

      const products = productsResp.data || [];
      const orders = ordersResp.data || [];
      const customers = customersResp.data || [];

      const now = new Date();
      const generated = [];

      // 1. Group Orders into Transactions to avoid redundant notifications
      const txnMap = new Map();
      orders.forEach(order => {
        const txnId = order.transaction_id || `txn-${order.id}`;
        if (!txnMap.has(txnId)) {
          txnMap.set(txnId, {
            transactionId: txnId,
            customerId: order.customer_id,
            customerName: order.customer_name || 'Unknown',
            orderDate: order.order_date,
            status: order.status || 'Active',
            isPaid: order.is_paid,
            totalAmount: 0
          });
        }
        
        const txn = txnMap.get(txnId);
        txn.totalAmount += (Number(order.quantity) || 0) * (Number(order.unit_price) || 0);
        if (order.order_date && (!txn.orderDate || new Date(order.order_date) < new Date(txn.orderDate))) {
          txn.orderDate = order.order_date;
        }
      });

      const transactions = Array.from(txnMap.values());
      const currentTxnIds = {};
      transactions.forEach(txn => { currentTxnIds[txn.transactionId] = true; });

      // 2. Customer Status Tracking
      const currentStatus = {};
      customers.forEach(customer => {
        const custTxns = transactions.filter(t => String(t.customerId) === String(customer.id));
        const cancelledCount = custTxns.filter(t => t.status.toLowerCase() === 'cancelled').length;
        const totalTxns = custTxns.length;
        const isRepeat = customer.is_repeat_customer || totalTxns >= 2;
        const cancellationRate = totalTxns === 0 ? 0 : cancelledCount / totalTxns;

        if (customer.manual_bogus) {
          currentStatus[customer.id] = 'bogus';
        } else if (totalTxns === 0) {
          currentStatus[customer.id] = 'new';
        } else if (isRepeat && cancellationRate <= 0.2) {
          currentStatus[customer.id] = 'loyal';
        } else if (cancellationRate > 0.5) {
          currentStatus[customer.id] = 'bogus';
        } else {
          currentStatus[customer.id] = 'regular';
        }
      });

      // If first load, just initialize memory so we don't spam historical alerts
      if (!notificationsInitialized) {
        setCustomerStatusMap(currentStatus);
        setSeenTxnIds(currentTxnIds);
        setNotificationsInitialized(true);
        saveToLocalStorage('customerStatusMap', currentStatus);
        saveToLocalStorage('seenTxnIds', currentTxnIds);
        saveToLocalStorage('notificationsInitialized', true);
        return; 
      }

      // 3. Process Customer Status Changes
      customers.forEach(customer => {
        const prevStatus = customerStatusMap[customer.id];
        const currStatus = currentStatus[customer.id];

        if (prevStatus !== currStatus) {
          if (!prevStatus && currStatus === 'new') {
            generated.push({
              id: `customer-new-${customer.id}`,
              category: 'customer-new',
              message: `👋 New Customer: ${customer.name} has registered or placed their first order.`,
              timestamp: new Date().toISOString()
            });
          } else if (currStatus === 'loyal' && prevStatus !== 'loyal') {
            generated.push({
              id: `customer-loyal-${customer.id}-${Date.now()}`,
              category: 'customer-loyal',
              message: `⭐ Status Upgrade: ${customer.name} is now recognized as a Loyal customer.`,
              timestamp: new Date().toISOString()
            });
          } else if (currStatus === 'bogus' && prevStatus !== 'bogus') {
            generated.push({
              id: `customer-bogus-${customer.id}-${Date.now()}`,
              category: 'customer-bogus',
              message: `⛔ Account Flagged: ${customer.name} has been marked as a Bogus buyer.`,
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      // 4. Process New Transactions and 3-Day Auto Cancellations
      transactions.forEach(txn => {
        // A. New Transactions
        if (!seenTxnIds[txn.transactionId]) {
          const shortId = txn.transactionId.length > 8 ? txn.transactionId.substring(0, 8) + '...' : txn.transactionId;
          generated.push({
            id: `txn-new-${txn.transactionId}`,
            category: 'order-new',
            message: `🛒 New Order: ${txn.customerName} placed a new transaction (#${shortId}).`,
            timestamp: txn.orderDate || new Date().toISOString()
          });
        }

        // B. Pending Transaction 3-Day Rule
        if (txn.status === 'Active' && !txn.isPaid) {
          const txnDate = txn.orderDate ? new Date(txn.orderDate) : null;
          if (txnDate) {
            const days = Math.floor((now - txnDate) / (1000 * 60 * 60 * 24));
            
            // If pending for 3 days or more, automatically cancel it via Supabase
            if (days >= 3) {
              const shortId = txn.transactionId.length > 8 ? txn.transactionId.substring(0, 8) + '...' : txn.transactionId;
              
              // 1. Run the background update to cancel
              supabase.from('orders')
                .update({ 
                  status: 'Cancelled', 
                  cancellation_reason: 'System Auto-cancelled: Pending payment for 3+ days',
                  cancelled_date: new Date().toISOString()
                })
                .eq('transaction_id', txn.transactionId)
                .then(({ error }) => {
                  if (error && txn.transactionId.startsWith('txn-')) {
                    // Fallback if transaction_id was fake
                    supabase.from('orders').update({ status: 'Cancelled' }).eq('id', txn.transactionId.replace('txn-', '')).then();
                  }
                });

              // 2. Alert the admin
              generated.push({
                id: `txn-autocancel-${txn.transactionId}`,
                category: 'order-cancelled',
                message: `⛔ Auto-Cancelled: Transaction #${shortId} from ${txn.customerName} was cancelled (unpaid for 3 days).`,
                timestamp: new Date().toISOString()
              });
            } else if (days === 2) {
               // 2-day warning
               const shortId = txn.transactionId.length > 8 ? txn.transactionId.substring(0, 8) + '...' : txn.transactionId;
               generated.push({
                id: `txn-warning-${txn.transactionId}`,
                category: 'order-warning',
                message: `⏳ Action Required: Transaction #${shortId} from ${txn.customerName} will be auto-cancelled tomorrow.`,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      });

      // 5. Process Stock Warnings
      products.forEach(product => {
        const rem = product.sizes?.[0]?.remaining_quantity || 0;
        if (rem <= 3 && rem > 0) {
          generated.push({
            id: `product-critical-${product.id}`,
            category: 'product-critical',
            message: `🚨 Critical Stock: ${product.name || 'Unnamed product'} is almost depleted (${rem} remaining).`,
            timestamp: new Date().toISOString()
          });
        } else if (rem === 5) {
          generated.push({
            id: `product-low-${product.id}`,
            category: 'product-low',
            message: `⚠️ Low Stock Alert: ${product.name || 'Unnamed product'} is down to ${rem} units.`,
            timestamp: new Date().toISOString()
          });
        }
      });

      mergeGeneratedNotifications(generated, currentDeletedIds);
      setCustomerStatusMap(currentStatus);
      setSeenTxnIds(currentTxnIds);
      saveToLocalStorage('customerStatusMap', currentStatus);
      saveToLocalStorage('seenTxnIds', currentTxnIds);
      
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const toggleOpen = () => setOpen(v => !v);

  const handleOverlayClick = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
  };

  const markAsRead = (id) => {
    const next = storedNotifications.map(n => n.id === id ? { ...n, read: true } : n);
    setStoredNotifications(next);
    saveToLocalStorage('notifications', next);
  };

  const markAllAsRead = () => {
    const next = storedNotifications.map(n => ({ ...n, read: true }));
    setStoredNotifications(next);
    saveToLocalStorage('notifications', next);
  };

  const deleteNotification = (id) => {
    const nextDeleted = Array.from(new Set([...deletedIds, id]));
    setDeletedIds(nextDeleted);
    saveToLocalStorage('deletedNotifications', nextDeleted);

    const nextStored = storedNotifications.filter(n => n.id !== id);
    setStoredNotifications(nextStored);
    saveToLocalStorage('notifications', nextStored);
  };

  const visibleNotes = filter === 'unread' ? storedNotifications.filter(n => !n.read) : storedNotifications;

  // Notification card component with live time display
  const NotificationCard = ({ note }) => {
    const timeDisplay = useTimeAgo(note.timestamp);
    
    let borderColor = 'border-gray-200';
    if (note.category?.includes('critical') || note.category?.includes('autocancel') || note.category?.includes('bogus')) borderColor = 'border-red-400';
    else if (note.category?.includes('warning') || note.category?.includes('low')) borderColor = 'border-yellow-400';
    else if (note.category?.includes('new')) borderColor = 'border-blue-300';
    else if (note.category?.includes('loyal')) borderColor = 'border-green-400';

    return (
      <div className={`p-4 rounded-xl bg-white border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow flex justify-between items-start`}>
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${note.read ? 'bg-transparent' : 'bg-[#841c4f]'}`} />
            <div>
              <div className="text-sm text-gray-800 font-medium leading-snug">{note.message}</div>
              <div className="text-xs text-gray-500 mt-1.5">{timeDisplay}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 ml-4 flex-shrink-0">
          {!note.read && (
            <button onClick={() => markAsRead(note.id)} className="text-xs font-semibold text-[#65366F] hover:text-[#841c4f] transition-colors">Mark read</button>
          )}
          <button onClick={() => deleteNotification(note.id)} className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">Dismiss</button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center">
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-full hover:bg-[#ffe2f0] transition-colors"
        aria-label="Notifications"
      >
        <img
          src="/icons/notif.png"
          alt="Notifications"
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
          style={{ display: useFallbackIcon ? 'none' : 'inline' }}
          onError={(e) => { setUseFallbackIcon(true); e.target.style.display = 'none'; }}
        />
        {useFallbackIcon && (
          <svg width="20" height="20" className="sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 17H9l-1-1V11a5 5 0 0110 0v5l-1 1z" stroke="#D1C6F3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#D1C6F3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0 -right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div ref={overlayRef} onClick={handleOverlayClick} className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" />
          <aside ref={panelRef} className="absolute right-0 top-0 h-full w-[320px] sm:w-[420px] shadow-2xl p-3 sm:p-4 flex flex-col z-50" style={{ background: 'linear-gradient(135deg, #e7d6f7 0%, #f7d6d0 100%)' }}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex gap-3 items-center">
                  <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
                  <div className="text-sm text-gray-500">{storedNotifications.length} items</div>
                </div>
                <button onClick={() => setOpen(false)} className="text-xl text-gray-400 hover:text-gray-700">×</button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-2">
                  <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded text-gray-800 ${filter === 'all' ? '' : 'bg-white/80'}`} style={filter === 'all' ? { background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' } : {}}>All</button>
                  <button onClick={() => setFilter('unread')} className={`px-3 py-1 rounded text-gray-800 ${filter === 'unread' ? '' : 'bg-white/80'}`} style={filter === 'unread' ? { background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' } : {}}>Unread</button>
                </div>
                <div className="ml-auto">
                  <button onClick={markAllAsRead} className="px-3 py-1 bg-white/90 text-gray-800 rounded text-sm font-semibold hover:bg-white transition-colors shadow-sm">Mark all as read</button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {visibleNotes.length === 0 ? (
                <div className="text-center text-gray-700 mt-12 font-medium">You're all caught up!</div>
              ) : (
                visibleNotes.map(note => (
                  <NotificationCard key={note.id} note={note} />
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
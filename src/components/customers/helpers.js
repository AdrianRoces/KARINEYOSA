import { CUSTOMER_TAGS } from './constants';

export function computeCustomerTag(totalOrders) {
  if (totalOrders === 0) return CUSTOMER_TAGS.NEW;
  if (totalOrders === 1) return CUSTOMER_TAGS.NEW;
  if (totalOrders === 2) return CUSTOMER_TAGS.REGULAR;
  return totalOrders >= 3 ? CUSTOMER_TAGS.LOYAL : CUSTOMER_TAGS.NEW;
}

export function getFinalTag(customer) {
  const isBogus = customer.manual_bogus !== undefined ? customer.manual_bogus : customer.manualBogus;
  
  if (isBogus === true) {
    return CUSTOMER_TAGS.BOGUS;
  }

  const ordersCount = customer.total_orders !== undefined ? customer.total_orders : customer.totalOrders;
  return computeCustomerTag(ordersCount || 0);
}

export function getComputedTag(customer) {
  const ordersCount = customer.total_orders !== undefined ? customer.total_orders : customer.totalOrders;
  return computeCustomerTag(ordersCount || 0);
}

export function isManuallyOverridden(customer) {
  const isBogus = customer.manual_bogus !== undefined ? customer.manual_bogus : customer.manualBogus;
  return isBogus === true;
}

/**
 * Format customer summary for display
 */
export function getCustomerSummary(customer) {
  const finalTag = getFinalTag(customer);
  const computedTag = getComputedTag(customer);
  const isOverridden = isManuallyOverridden(customer);

  return {
    name: customer.name,
    totalOrders: customer.totalOrders,
    cancelledTransactions: customer.cancelledOrderCount || 0,
    totalSpent: customer.totalSpent || 0,
    finalTag,
    computedTag,
    isOverridden,
    manualBogus: customer.manualBogus || false,
    firstOrderDate: customer.firstOrderDate,
    lastOrderDate: customer.lastOrderDate
  };
}

/**
 * Get tag recommendation message
 */
export function getTagRecommendation(customer) {
  if (customer.manualBogus === true) {
    return '🚫 Manually marked as Bogus';
  }

  switch (customer.totalOrders) {
    case 0:
      return 'No orders yet';
    case 1:
      return '🆕 First-time customer (1 order)';
    case 2:
      return '🔄 Regular customer (2 orders)';
    default:
      return `⭐ Loyal customer (${customer.totalOrders} orders)`;
  }
}

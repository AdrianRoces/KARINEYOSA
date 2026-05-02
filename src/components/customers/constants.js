// Ensure this file exports CUSTOMER_TAGS properly so QUICK_REFERENCE doesn't throw errors
export const CUSTOMER_TAGS = {
  NEW: 'New',
  REGULAR: 'Regular',
  LOYAL: 'Loyal',
  BOGUS: 'Bogus'
};

export const TAG_STYLES = {
  [CUSTOMER_TAGS.NEW]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500'
  },
  [CUSTOMER_TAGS.REGULAR]: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-500'
  },
  [CUSTOMER_TAGS.LOYAL]: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    dot: 'bg-green-500'
  },
  [CUSTOMER_TAGS.BOGUS]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    dot: 'bg-red-500'
  }
};
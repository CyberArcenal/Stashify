export const PRODUCT_STATUS = {
  IN_STOCK: 'in-stock',
  LOW_STOCK: 'low-stock',
  OUT_OF_STOCK: 'out-of-stock'
} as const

export const ORDER_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export const PURCHASE_STATUS = {
  PENDING: 'pending',
  RECEIVED: 'received',
  CANCELLED: 'cancelled'
} as const

export const STOCK_MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT'
} as const

export const DEFAULT_LOW_STOCK_THRESHOLD = 5
export const ITEMS_PER_PAGE = 10
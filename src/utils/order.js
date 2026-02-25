// utils/orderUtils.js
//@ts-check

/**
 * Validate order data before creation
 * @param {Object} data - Order data from request
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateOrderData(data) {
  const errors = [];

  // Required fields
  // @ts-ignore
  if (!data.order_number) {
    errors.push("order_number is required");
  // @ts-ignore
  } else if (typeof data.order_number !== "string") {
    errors.push("order_number must be a string");
  }

  // @ts-ignore
  if (!data.items || !Array.isArray(data.items)) {
    errors.push("items must be an array");
  // @ts-ignore
  } else if (data.items.length === 0) {
    errors.push("items array cannot be empty");
  } else {
    // Validate each item
    // @ts-ignore
    data.items.forEach((item, index) => {
      const prefix = `item[${index}]: `;

      if (!item.productId) {
        errors.push(prefix + "productId is required");
      } else if (typeof item.productId !== "number") {
        errors.push(prefix + "productId must be a number");
      }

      if (item.quantity === undefined || item.quantity === null) {
        errors.push(prefix + "quantity is required");
      } else if (typeof item.quantity !== "number" || item.quantity <= 0) {
        errors.push(prefix + "quantity must be a positive number");
      }

      if (item.unitPrice !== undefined && typeof item.unitPrice !== "number") {
        errors.push(prefix + "unitPrice must be a number");
      }

      if (item.discount !== undefined && typeof item.discount !== "number") {
        errors.push(prefix + "discount must be a number");
      }

      if (item.taxRate !== undefined && typeof item.taxRate !== "number") {
        errors.push(prefix + "taxRate must be a number");
      }

      if (item.variantId !== undefined && typeof item.variantId !== "number") {
        errors.push(prefix + "variantId must be a number");
      }

      if (item.warehouseId !== undefined && typeof item.warehouseId !== "number") {
        errors.push(prefix + "warehouseId must be a number");
      }
    });
  }

  // @ts-ignore
  if (data.customerId !== undefined && typeof data.customerId !== "number") {
    errors.push("customerId must be a number");
  }

  // @ts-ignore
  if (data.notes !== undefined && typeof data.notes !== "string") {
    errors.push("notes must be a string");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateOrderData };
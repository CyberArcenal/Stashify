// utils/purchaseUtils.js
//@ts-check

/**
 * Validate purchase data before creation
 * @param {Object} data - Purchase data from request
 * @returns {{valid: boolean, errors: string[]}}
 */
function validatePurchaseData(data) {
  const errors = [];

  // Required fields
  // @ts-ignore
  if (!data.purchase_number) {
    errors.push("purchase_number is required");
  // @ts-ignore
  } else if (typeof data.purchase_number !== "string") {
    errors.push("purchase_number must be a string");
  }

  // @ts-ignore
  if (!data.supplierId) {
    errors.push("supplierId is required");
  // @ts-ignore
  } else if (typeof data.supplierId !== "number") {
    errors.push("supplierId must be a number");
  }

  // @ts-ignore
  if (!data.warehouseId) {
    errors.push("warehouseId is required");
  // @ts-ignore
  } else if (typeof data.warehouseId !== "number") {
    errors.push("warehouseId must be a number");
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

      if (item.unitCost !== undefined && typeof item.unitCost !== "number") {
        errors.push(prefix + "unitCost must be a number");
      }

      if (item.tax !== undefined && typeof item.tax !== "number") {
        errors.push(prefix + "tax must be a number");
      }

      if (item.variantId !== undefined && typeof item.variantId !== "number") {
        errors.push(prefix + "variantId must be a number");
      }
    });
  }

  // @ts-ignore
  if (data.notes !== undefined && typeof data.notes !== "string") {
    errors.push("notes must be a string");
  }

  // @ts-ignore
  if (data.tax_rate !== undefined && typeof data.tax_rate !== "number") {
    errors.push("tax_rate must be a number");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePurchaseData };
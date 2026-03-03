// src/main/ipc/order/create.ipc.js
const orderService = require("../../../../services/Order");

/**
 * Create a new order
 * @param {Object} params - Request parameters
 * @param {string} params.order_number - Unique order number (required)
 * @param {number} [params.customerId] - Customer ID (optional)
 * @param {string} [params.notes] - Order notes
 * @param {Array<Object>} params.items - Array of order items (required)
 * @param {number} params.items[].productId - Product ID
 * @param {number} params.items[].quantity - Quantity
 * @param {number} [params.items[].unitPrice] - Unit price (optional, defaults to product net_price)
 * @param {number} [params.items[].discount] - Line discount amount
 * @param {number} [params.items[].taxRate] - Tax rate as percentage (optional, defaults to system tax rate)
 * @param {number} [params.items[].variantId] - Variant ID (optional)
 * @param {number} [params.items[].warehouseId] - Warehouse ID (optional)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (
      !params.order_number ||
      typeof params.order_number !== "string" ||
      params.order_number.trim() === ""
    ) {
      return {
        status: false,
        message: "Order number is required and must be a non-empty string.",
        data: null,
      };
    }
    if (
      !params.items ||
      !Array.isArray(params.items) ||
      params.items.length === 0
    ) {
      return {
        status: false,
        message: "At least one order item is required.",
        data: null,
      };
    }

    // Validate customerId if provided
    if (params.customerId !== undefined && params.customerId !== null) {
      const custId = Number(params.customerId);
      if (!Number.isInteger(custId) || custId <= 0) {
        return {
          status: false,
          message: "Invalid customerId. Must be a positive integer.",
          data: null,
        };
      }
      params.customerId = custId;
    }

    // Validate new fields
    if (
      params.usedLoyalty !== undefined &&
      typeof params.usedLoyalty !== "boolean"
    ) {
      return {
        status: false,
        message: "usedLoyalty must be a boolean.",
        data: null,
      };
    }
    if (params.loyaltyRedeemed !== undefined) {
      const val = Number(params.loyaltyRedeemed);
      if (isNaN(val) || val < 0) {
        return {
          status: false,
          message: "loyaltyRedeemed must be a non-negative number.",
          data: null,
        };
      }
      params.loyaltyRedeemed = val;
    }
    if (
      params.usedDiscount !== undefined &&
      typeof params.usedDiscount !== "boolean"
    ) {
      return {
        status: false,
        message: "usedDiscount must be a boolean.",
        data: null,
      };
    }
    if (params.totalDiscount !== undefined) {
      const val = Number(params.totalDiscount);
      if (isNaN(val) || val < 0) {
        return {
          status: false,
          message: "totalDiscount must be a non-negative number.",
          data: null,
        };
      }
      params.totalDiscount = val;
    }
    if (
      params.usedVoucher !== undefined &&
      typeof params.usedVoucher !== "boolean"
    ) {
      return {
        status: false,
        message: "usedVoucher must be a boolean.",
        data: null,
      };
    }
    if (
      params.voucherCode !== undefined &&
      typeof params.voucherCode !== "string"
    ) {
      return {
        status: false,
        message: "voucherCode must be a string.",
        data: null,
      };
    }

    // Validate each item
    for (let i = 0; i < params.items.length; i++) {
      const item = params.items[i];
      if (!item.productId) {
        return {
          status: false,
          message: `Item at index ${i} missing productId.`,
          data: null,
        };
      }
      const prodId = Number(item.productId);
      if (!Number.isInteger(prodId) || prodId <= 0) {
        return {
          status: false,
          message: `Item at index ${i}: productId must be a positive integer.`,
          data: null,
        };
      }
      item.productId = prodId;

      if (item.quantity === undefined || item.quantity === null) {
        return {
          status: false,
          message: `Item at index ${i} missing quantity.`,
          data: null,
        };
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return {
          status: false,
          message: `Item at index ${i}: quantity must be a positive integer.`,
          data: null,
        };
      }
      item.quantity = qty;

      if (item.unitPrice !== undefined) {
        const price = Number(item.unitPrice);
        if (isNaN(price) || price < 0) {
          return {
            status: false,
            message: `Item at index ${i}: unitPrice must be a non-negative number.`,
            data: null,
          };
        }
        item.unitPrice = price;
      }

      if (item.discount !== undefined) {
        const disc = Number(item.discount);
        if (isNaN(disc) || disc < 0) {
          return {
            status: false,
            message: `Item at index ${i}: discount must be a non-negative number.`,
            data: null,
          };
        }
        item.discount = disc;
      }

      if (item.taxRate !== undefined) {
        const tax = Number(item.taxRate);
        if (isNaN(tax) || tax < 0 || tax > 100) {
          return {
            status: false,
            message: `Item at index ${i}: taxRate must be a number between 0 and 100.`,
            data: null,
          };
        }
        item.taxRate = tax;
      }

      if (item.variantId !== undefined && item.variantId !== null) {
        const varId = Number(item.variantId);
        if (!Number.isInteger(varId) || varId <= 0) {
          return {
            status: false,
            message: `Item at index ${i}: variantId must be a positive integer.`,
            data: null,
          };
        }
        item.variantId = varId;
      }

      if (item.warehouseId !== undefined && item.warehouseId !== null) {
        const whId = Number(item.warehouseId);
        if (!Number.isInteger(whId) || whId <= 0) {
          return {
            status: false,
            message: `Item at index ${i}: warehouseId must be a positive integer.`,
            data: null,
          };
        }
        item.warehouseId = whId;
      }
    }

    // Prepare data for service
    const orderData = {
      order_number: params.order_number.trim(),
      customerId: params.customerId,
      notes: params.notes,
      items: params.items,
      usedLoyalty: params.usedLoyalty,
      loyaltyRedeemed: params.loyaltyRedeemed,
      usedDiscount: params.usedDiscount,
      totalDiscount: params.totalDiscount,
      usedVoucher: params.usedVoucher,
      voucherCode: params.voucherCode,
    };

    // Create order using service
    const newOrder = await orderService.create(orderData, user);

    return {
      status: true,
      message: "Order created successfully",
      data: newOrder,
    };
  } catch (error) {
    console.error("Error in createOrder:", error);
    return {
      status: false,
      message: error.message || "Failed to create order",
      data: null,
    };
  }
};

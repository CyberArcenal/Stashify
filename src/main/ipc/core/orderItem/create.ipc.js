// src/main/ipc/orderItem/create.ipc.js


const orderItemService = require("../../../../services/OrderItem");

/**
 * Create a new order item
 * @param {Object} params - Request parameters
 * @param {number} params.orderId - Order ID (required)
 * @param {number} params.productId - Product ID (required)
 * @param {number} params.quantity - Quantity (required)
 * @param {number} [params.unit_price] - Unit price (if not provided, will use product's net_price)
 * @param {number} [params.discount_amount=0] - Line discount amount
 * @param {number} [params.tax_rate=0] - Tax rate as percentage
 * @param {number} [params.line_net_total] - Computed net total (optional, will compute if not provided)
 * @param {number} [params.line_tax_total] - Computed tax total
 * @param {number} [params.line_gross_total] - Computed gross total
 * @param {number} [params.variantId] - Product variant ID (optional)
 * @param {number} [params.warehouseId] - Warehouse ID (optional)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.orderId) {
      return {
        status: false,
        message: "Missing required parameter: orderId",
        data: null,
      };
    }
    if (!params.productId) {
      return {
        status: false,
        message: "Missing required parameter: productId",
        data: null,
      };
    }
    if (params.quantity === undefined || params.quantity === null) {
      return {
        status: false,
        message: "Missing required parameter: quantity",
        data: null,
      };
    }

    // Convert and validate IDs
    const orderId = Number(params.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return {
        status: false,
        message: "Invalid orderId. Must be a positive integer.",
        data: null,
      };
    }
    params.orderId = orderId;

    const productId = Number(params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return {
        status: false,
        message: "Invalid productId. Must be a positive integer.",
        data: null,
      };
    }
    params.productId = productId;

    const quantity = Number(params.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        status: false,
        message: "Invalid quantity. Must be a positive integer.",
        data: null,
      };
    }
    params.quantity = quantity;

    // Validate optional IDs
    if (params.variantId !== undefined && params.variantId !== null) {
      const variantId = Number(params.variantId);
      if (!Number.isInteger(variantId) || variantId <= 0) {
        return {
          status: false,
          message: "Invalid variantId. Must be a positive integer.",
          data: null,
        };
      }
      params.variantId = variantId;
    }

    if (params.warehouseId !== undefined && params.warehouseId !== null) {
      const warehouseId = Number(params.warehouseId);
      if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
        return {
          status: false,
          message: "Invalid warehouseId. Must be a positive integer.",
          data: null,
        };
      }
      params.warehouseId = warehouseId;
    }

    // Validate numeric fields
    const numericFields = ['unit_price', 'discount_amount', 'tax_rate', 'line_net_total', 'line_tax_total', 'line_gross_total'];
    for (const field of numericFields) {
      if (params[field] !== undefined) {
        const val = Number(params[field]);
        if (isNaN(val) || val < 0) {
          return {
            status: false,
            message: `${field} must be a non-negative number.`,
            data: null,
          };
        }
        params[field] = val;
      }
    }

    // Prepare data for service
    const itemData = {
      orderId: params.orderId,
      productId: params.productId,
      quantity: params.quantity,
      unit_price: params.unit_price,
      discount_amount: params.discount_amount !== undefined ? params.discount_amount : 0,
      tax_rate: params.tax_rate !== undefined ? params.tax_rate : 0,
      line_net_total: params.line_net_total,
      line_tax_total: params.line_tax_total,
      line_gross_total: params.line_gross_total,
      variantId: params.variantId,
      warehouseId: params.warehouseId,
    };

    // Remove undefined values
    Object.keys(itemData).forEach(key => itemData[key] === undefined && delete itemData[key]);

    // Create order item using service
    const newItem = await orderItemService.create(itemData, user);

    return {
      status: true,
      message: "Order item created successfully",
      data: newItem,
    };
  } catch (error) {
    console.error("Error in createOrderItem:", error);
    return {
      status: false,
      message: error.message || "Failed to create order item",
      data: null,
    };
  }
};
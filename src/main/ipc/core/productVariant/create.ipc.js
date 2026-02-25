// src/main/ipc/productVariant/create.ipc.js


const productVariantService = require("../../../../services/ProductVariant");

/**
 * Create a new product variant
 * @param {Object} params - Request parameters
 * @param {number} params.productId - Product ID (required)
 * @param {string} params.name - Variant name (required)
 * @param {string} [params.sku] - SKU (unique)
 * @param {number} [params.net_price] - Net price
 * @param {number} [params.cost_per_item] - Cost per item
 * @param {string} [params.barcode] - Barcode (unique)
 * @param {boolean} [params.is_active=true] - Active status
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.productId) {
      return {
        status: false,
        message: "Missing required parameter: productId",
        data: null,
      };
    }
    if (!params.name || typeof params.name !== "string" || params.name.trim() === "") {
      return {
        status: false,
        message: "Variant name is required and must be a non-empty string.",
        data: null,
      };
    }

    const productId = Number(params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return {
        status: false,
        message: "Invalid productId. Must be a positive integer.",
        data: null,
      };
    }
    params.productId = productId;

    // Validate optional numeric fields
    if (params.net_price !== undefined) {
      const price = Number(params.net_price);
      if (isNaN(price) || price < 0) {
        return {
          status: false,
          message: "net_price must be a non-negative number.",
          data: null,
        };
      }
      params.net_price = price;
    }
    if (params.cost_per_item !== undefined) {
      const cost = Number(params.cost_per_item);
      if (isNaN(cost) || cost < 0) {
        return {
          status: false,
          message: "cost_per_item must be a non-negative number.",
          data: null,
        };
      }
      params.cost_per_item = cost;
    }

    // Prepare data for service
    const variantData = {
      productId: params.productId,
      name: params.name.trim(),
      sku: params.sku?.trim(),
      net_price: params.net_price,
      cost_per_item: params.cost_per_item,
      barcode: params.barcode?.trim(),
      is_active: params.is_active !== undefined ? params.is_active : true,
    };

    // Remove undefined
    Object.keys(variantData).forEach(key => variantData[key] === undefined && delete variantData[key]);

    // Create variant using service
    const newVariant = await productVariantService.create(variantData, user);

    return {
      status: true,
      message: "Product variant created successfully",
      data: newVariant,
    };
  } catch (error) {
    console.error("Error in createProductVariant:", error);
    return {
      status: false,
      message: error.message || "Failed to create product variant",
      data: null,
    };
  }
};
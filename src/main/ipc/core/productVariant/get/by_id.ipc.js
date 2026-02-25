// src/main/ipc/productVariant/get/by_id.ipc.js
// @ts-check

const productVariantService = require("../../../../../services/ProductVariant");

/**
 * Get a single product variant by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Variant ID
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required id
    if (!params.id) {
      return {
        status: false,
        message: "Missing required parameter: id",
        data: null,
      };
    }

    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        status: false,
        message: "Invalid id. Must be a positive integer.",
        data: null,
      };
    }

    // Fetch variant from service
    const variant = await productVariantService.findById(id);

    return {
      status: true,
      message: "Product variant retrieved successfully",
      data: variant,
    };
  } catch (error) {
    console.error("Error in getProductVariantById:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to retrieve product variant",
      data: null,
    };
  }
};
// src/main/ipc/product/get/by_id.ipc.js
const productService = require("../../../../../services/Product");

/**
 * Get a single product by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Product ID
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

    // Fetch product from service
    const product = await productService.findById(id);

    return {
      status: true,
      message: "Product retrieved successfully",
      data: product,
    };
  } catch (error) {
    console.error("Error in getProductById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve product",
      data: null,
    };
  }
};
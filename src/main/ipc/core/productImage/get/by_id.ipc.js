// src/main/ipc/productImage/get/by_id.ipc.js


const productImageService = require("../../../../../services/ProductImage");

/**
 * Get a single product image by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Product image ID
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

    // Fetch product image from service
    const image = await productImageService.findById(id);

    return {
      status: true,
      message: "Product image retrieved successfully",
      data: image,
    };
  } catch (error) {
    console.error("Error in getProductImageById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve product image",
      data: null,
    };
  }
};
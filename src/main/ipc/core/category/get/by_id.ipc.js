// src/main/ipc/category/get/by_id.ipc.js

const categoryService = require("../../../../../services/Category");

/**
 * Get a single category by its ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Category ID
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

    // Fetch category from service
    const category = await categoryService.findById(id);

    return {
      status: true,
      message: "Category retrieved successfully",
      data: category,
    };
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve category",
      data: null,
    };
  }
};
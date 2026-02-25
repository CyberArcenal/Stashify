// src/main/ipc/productImage/create.ipc.js


const productImageService = require("../../../../services/ProductImage");

/**
 * Create a new product image
 * @param {Object} params - Request parameters
 * @param {number} params.productId - Product ID (required)
 * @param {string} [params.image_url] - Image URL
 * @param {string} [params.image_path] - Image file path
 * @param {string} [params.alt_text] - Alt text for image
 * @param {boolean} [params.is_primary=false] - Whether this is the primary image
 * @param {number} [params.sort_order=0] - Sort order
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

    const productId = Number(params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return {
        status: false,
        message: "Invalid productId. Must be a positive integer.",
        data: null,
      };
    }
    params.productId = productId;

    // At least one of image_url or image_path should be provided
    if (!params.image_url && !params.image_path) {
      return {
        status: false,
        message: "Either image_url or image_path must be provided.",
        data: null,
      };
    }

    // Validate is_primary if provided
    if (params.is_primary !== undefined && typeof params.is_primary !== "boolean") {
      return {
        status: false,
        message: "Invalid is_primary. Must be a boolean value.",
        data: null,
      };
    }

    // Validate sort_order if provided
    if (params.sort_order !== undefined) {
      const sortOrder = Number(params.sort_order);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        return {
          status: false,
          message: "Invalid sort_order. Must be a non-negative integer.",
          data: null,
        };
      }
      params.sort_order = sortOrder;
    }

    // Prepare data for service
    const imageData = {
      productId: params.productId,
      image_url: params.image_url,
      image_path: params.image_path,
      alt_text: params.alt_text,
      is_primary: params.is_primary !== undefined ? params.is_primary : false,
      sort_order: params.sort_order !== undefined ? params.sort_order : 0,
    };

    // Remove undefined values (though we've handled defaults)
    Object.keys(imageData).forEach(key => imageData[key] === undefined && delete imageData[key]);

    // Create product image using service
    const newImage = await productImageService.create(imageData, user);

    return {
      status: true,
      message: "Product image created successfully",
      data: newImage,
    };
  } catch (error) {
    console.error("Error in createProductImage:", error);
    return {
      status: false,
      message: error.message || "Failed to create product image",
      data: null,
    };
  }
};
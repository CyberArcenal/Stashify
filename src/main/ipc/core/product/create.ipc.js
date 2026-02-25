// src/main/ipc/product/create.ipc.js

const productService = require("../../../../services/Product");

/**
 * Create a new product
 * @param {Object} params - Request parameters
 * @param {string} params.name - Product name (required)
 * @param {string} params.sku - SKU (required, unique)
 * @param {string} [params.slug] - URL slug (auto-generated if not provided)
 * @param {string} [params.description] - Description
 * @param {number} [params.net_price] - Net price
 * @param {number} [params.cost_per_item] - Cost per item
 * @param {boolean} [params.track_quantity=true] - Track quantity
 * @param {boolean} [params.allow_backorder=false] - Allow backorder
 * @param {number} [params.compare_price] - Compare price
 * @param {string} [params.barcode] - Barcode
 * @param {number} [params.weight] - Weight
 * @param {string} [params.dimensions] - Dimensions
 * @param {boolean} [params.is_published=false] - Published status
 * @param {boolean} [params.is_active=true] - Active status
 * @param {number} [params.categoryId] - Category ID
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.name || typeof params.name !== "string" || params.name.trim() === "") {
      return {
        status: false,
        message: "Product name is required and must be a non-empty string.",
        data: null,
      };
    }
    if (!params.sku || typeof params.sku !== "string" || params.sku.trim() === "") {
      return {
        status: false,
        message: "SKU is required and must be a non-empty string.",
        data: null,
      };
    }

    // Validate categoryId if provided
    if (params.categoryId !== undefined) {
      const catId = Number(params.categoryId);
      if (!Number.isInteger(catId) || catId <= 0) {
        return {
          status: false,
          message: "Invalid categoryId. Must be a positive integer.",
          data: null,
        };
      }
      params.categoryId = catId;
    }

    // Validate numeric fields
    const numericFields = ['net_price', 'cost_per_item', 'compare_price', 'weight'];
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
    const productData = {
      name: params.name.trim(),
      sku: params.sku.trim(),
      slug: params.slug?.trim(),
      description: params.description?.trim(),
      net_price: params.net_price,
      cost_per_item: params.cost_per_item,
      track_quantity: params.track_quantity !== undefined ? params.track_quantity : true,
      allow_backorder: params.allow_backorder !== undefined ? params.allow_backorder : false,
      compare_price: params.compare_price,
      barcode: params.barcode?.trim(),
      weight: params.weight,
      dimensions: params.dimensions?.trim(),
      is_published: params.is_published !== undefined ? params.is_published : false,
      is_active: params.is_active !== undefined ? params.is_active : true,
      categoryId: params.categoryId,
    };

    // Remove undefined values
    Object.keys(productData).forEach(key => productData[key] === undefined && delete productData[key]);

    // Create product using service
    const newProduct = await productService.create(productData, user);

    return {
      status: true,
      message: "Product created successfully",
      data: newProduct,
    };
  } catch (error) {
    console.error("Error in createProduct:", error);
    return {
      status: false,
      message: error.message || "Failed to create product",
      data: null,
    };
  }
};
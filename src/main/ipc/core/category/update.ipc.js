// src/main/ipc/category/update.ipc.js

const categoryService = require("../../../../services/Category");

/**
 * Update an existing category
 * @param {Object} params - Request parameters
 * @param {number} params.id - Category ID (required)
 * @param {string} [params.name] - Category name
 * @param {string} [params.slug] - URL slug
 * @param {string} [params.description] - Category description
 * @param {string} [params.image_path] - Image path
 * @param {string} [params.color] - Color code
 * @param {number|null} [params.parentId] - ID of parent category (null to remove parent)
 * @param {boolean} [params.is_active] - Active status
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
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

    // Validate parentId if provided
    if (params.parentId !== undefined && params.parentId !== null) {
      const parentId = Number(params.parentId);
      if (!Number.isInteger(parentId) || parentId <= 0) {
        return {
          status: false,
          message: "Invalid parentId. Must be a positive integer or null.",
          data: null,
        };
      }
      params.parentId = parentId;
    }

    // Prepare update data
    const updateData = {
      name: params.name?.trim(),
      slug: params.slug?.trim(),
      description: params.description?.trim(),
      image_path: params.image_path,
      color: params.color,
      parentId: params.parentId,
      is_active: params.is_active,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    // Update category using service
    const updatedCategory = await categoryService.update(id, updateData, user);

    return {
      status: true,
      message: "Category updated successfully",
      data: updatedCategory,
    };
  } catch (error) {
    console.error("Error in updateCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to update category",
      data: null,
    };
  }
};
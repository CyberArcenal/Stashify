// src/main/ipc/warehouse/update.ipc.js

const warehouseService = require("../../../../services/Warehouse");

/**
 * Update an existing warehouse
 * @param {Object} params - Request parameters
 * @param {number} params.id - Warehouse ID (required)
 * @param {string} [params.name] - Warehouse name
 * @param {string} [params.type] - Warehouse type
 * @param {string} [params.location] - Location
 * @param {number} [params.limit_capacity] - Limit capacity
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
    params.id = id;

    // Validate type if provided
    const validTypes = ['warehouse', 'store', 'online'];
    if (params.type && !validTypes.includes(params.type)) {
      return {
        status: false,
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}.`,
        data: null,
      };
    }

    // Validate limit_capacity if provided
    if (params.limit_capacity !== undefined) {
      const capacity = Number(params.limit_capacity);
      if (isNaN(capacity) || capacity < 0) {
        return {
          status: false,
          message: "limit_capacity must be a non-negative number.",
          data: null,
        };
      }
      params.limit_capacity = capacity;
    }

    // Prepare update data (excluding id)
    const { id: _, ...updateData } = params;

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.location !== undefined) {
      updateData.location = updateData.location?.trim() || ''; // keep empty string for uniqueness
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    // Update warehouse using service
    const updatedWarehouse = await warehouseService.update(id, updateData, user);

    return {
      status: true,
      message: "Warehouse updated successfully",
      data: updatedWarehouse,
    };
  } catch (error) {
    console.error("Error in updateWarehouse:", error);
    return {
      status: false,
      message: error.message || "Failed to update warehouse",
      data: null,
    };
  }
};
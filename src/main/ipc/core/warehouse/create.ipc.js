// src/main/ipc/warehouse/create.ipc.js


const warehouseService = require("../../../../services/Warehouse");

/**
 * Create a new warehouse
 * @param {Object} params - Request parameters
 * @param {string} params.name - Warehouse name (required)
 * @param {string} [params.type='warehouse'] - Warehouse type ('warehouse', 'store', 'online')
 * @param {string} [params.location] - Location (default empty string to satisfy unique constraint)
 * @param {number} [params.limit_capacity=0] - Limit capacity
 * @param {boolean} [params.is_active=true] - Active status
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
        message: "Warehouse name is required and must be a non-empty string.",
        data: null,
      };
    }

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

    // Prepare data for service
    const warehouseData = {
      name: params.name.trim(),
      type: params.type || 'warehouse',
      location: params.location?.trim() || '', // default to empty string for unique constraint
      limit_capacity: params.limit_capacity !== undefined ? params.limit_capacity : 0,
      is_active: params.is_active !== undefined ? params.is_active : true,
    };

    // Create warehouse using service
    const newWarehouse = await warehouseService.create(warehouseData, user);

    return {
      status: true,
      message: "Warehouse created successfully",
      data: newWarehouse,
    };
  } catch (error) {
    console.error("Error in createWarehouse:", error);
    return {
      status: false,
      message: error.message || "Failed to create warehouse",
      data: null,
    };
  }
};
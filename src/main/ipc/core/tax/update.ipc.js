// src/main/ipc/tax/update.ipc.js
const taxService = require("../../../../services/Tax");

module.exports = async (params, queryRunner, user = "system") => {
  try {
    const { id, ...updateData } = params;

    if (!id || isNaN(id) || id <= 0) {
      return {
        status: false,
        message: "Invalid tax ID",
        data: null,
      };
    }

    // Validate fields if provided
    if (updateData.name !== undefined && (typeof updateData.name !== "string" || updateData.name.trim() === "")) {
      return {
        status: false,
        message: "Tax name must be a non-empty string.",
        data: null,
      };
    }

    if (updateData.code !== undefined) {
      if (typeof updateData.code !== "string" || updateData.code.trim() === "") {
        return {
          status: false,
          message: "Tax code must be a non-empty string.",
          data: null,
        };
      }
      updateData.code = updateData.code.trim().toLowerCase().replace(/\s+/g, '_');
    }

    if (updateData.rate !== undefined && (isNaN(updateData.rate) || updateData.rate < 0)) {
      return {
        status: false,
        message: "Tax rate must be a non-negative number.",
        data: null,
      };
    }

    if (updateData.type !== undefined && !["percentage", "fixed"].includes(updateData.type)) {
      return {
        status: false,
        message: "Tax type must be either 'percentage' or 'fixed'.",
        data: null,
      };
    }

    // Clean up undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updatedTax = await taxService.update(Number(id), updateData, user);

    return {
      status: true,
      message: "Tax updated successfully",
      data: updatedTax,
    };
  } catch (error) {
    console.error("Error in updateTax:", error);
    return {
      status: false,
      message: error.message || "Failed to update tax",
      data: null,
    };
  }
};
// src/main/ipc/supplier/update.ipc.js


const supplierService = require("../../../../services/Supplier");

/**
 * Update an existing supplier
 * @param {Object} params - Request parameters
 * @param {number} params.id - Supplier ID (required)
 * @param {string} [params.name] - Supplier name
 * @param {string} [params.contact_person] - Contact person name
 * @param {string} [params.email] - Email address
 * @param {string} [params.phone] - Phone number
 * @param {string} [params.address] - Address
 * @param {string} [params.tax_id] - Tax ID
 * @param {string} [params.notes] - Notes
 * @param {string} [params.status] - Supplier status
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

    // Validate email format if provided
    if (params.email && typeof params.email === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(params.email)) {
        return {
          status: false,
          message: "Invalid email format.",
          data: null,
        };
      }
    }

    // Validate status if provided
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (params.status && !validStatuses.includes(params.status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
        data: null,
      };
    }

    // Prepare update data (excluding id)
    const { id: _, ...updateData } = params;

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.contact_person) updateData.contact_person = updateData.contact_person.trim();
    if (updateData.email) updateData.email = updateData.email.trim();
    if (updateData.phone) updateData.phone = updateData.phone.trim();
    if (updateData.address) updateData.address = updateData.address.trim();
    if (updateData.tax_id) updateData.tax_id = updateData.tax_id.trim();
    if (updateData.notes) updateData.notes = updateData.notes.trim();

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    // Update supplier using service
    const updatedSupplier = await supplierService.update(id, updateData, user);

    return {
      status: true,
      message: "Supplier updated successfully",
      data: updatedSupplier,
    };
  } catch (error) {
    console.error("Error in updateSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to update supplier",
      data: null,
    };
  }
};
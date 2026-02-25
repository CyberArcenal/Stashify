// src/main/ipc/supplier/create.ipc.js

const supplierService = require("../../../../services/Supplier");

/**
 * Create a new supplier
 * @param {Object} params - Request parameters
 * @param {string} params.name - Supplier name (required, unique)
 * @param {string} [params.contact_person] - Contact person name
 * @param {string} [params.email] - Email address
 * @param {string} [params.phone] - Phone number
 * @param {string} [params.address] - Address
 * @param {string} [params.tax_id] - Tax ID
 * @param {string} [params.notes] - Notes
 * @param {string} [params.status='pending'] - Supplier status ('pending', 'approved', 'rejected')
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
        message: "Supplier name is required and must be a non-empty string.",
        data: null,
      };
    }

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

    // Prepare data for service
    const supplierData = {
      name: params.name.trim(),
      contact_person: params.contact_person?.trim(),
      email: params.email?.trim(),
      phone: params.phone?.trim(),
      address: params.address?.trim(),
      tax_id: params.tax_id?.trim(),
      notes: params.notes?.trim(),
      status: params.status || 'pending',
      is_active: params.is_active !== undefined ? params.is_active : true,
    };

    // Remove undefined values
    Object.keys(supplierData).forEach(key => supplierData[key] === undefined && delete supplierData[key]);

    // Create supplier using service
    const newSupplier = await supplierService.create(supplierData, user);

    return {
      status: true,
      message: "Supplier created successfully",
      data: newSupplier,
    };
  } catch (error) {
    console.error("Error in createSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to create supplier",
      data: null,
    };
  }
};
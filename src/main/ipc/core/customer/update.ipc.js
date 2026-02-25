// src/main/ipc/customer/update.ipc.js


const customerService = require("../../../../services/Customer");

/**
 * Update an existing customer
 * @param {Object} params - Request parameters
 * @param {number} params.id - Customer ID (required)
 * @param {string} [params.name] - Customer name
 * @param {string} [params.contactInfo] - Contact information
 * @param {string} [params.email] - Email address
 * @param {string} [params.phone] - Phone number
 * @param {number} [params.loyaltyPointsBalance] - Loyalty points balance
 * @param {number} [params.lifetimePointsEarned] - Lifetime earned points
 * @param {string} [params.status] - Customer status ('regular', 'vip', 'elite')
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
    if (params.status && !["regular", "vip", "elite"].includes(params.status)) {
      return {
        status: false,
        message: "Invalid status. Must be one of: regular, vip, elite.",
        data: null,
      };
    }

    // Validate numeric fields
    if (
      params.loyaltyPointsBalance !== undefined &&
      (!Number.isInteger(params.loyaltyPointsBalance) ||
        params.loyaltyPointsBalance < 0)
    ) {
      return {
        status: false,
        message: "loyaltyPointsBalance must be a non-negative integer.",
        data: null,
      };
    }
    if (
      params.lifetimePointsEarned !== undefined &&
      (!Number.isInteger(params.lifetimePointsEarned) ||
        params.lifetimePointsEarned < 0)
    ) {
      return {
        status: false,
        message: "lifetimePointsEarned must be a non-negative integer.",
        data: null,
      };
    }

    // Prepare update data
    const updateData = {
      name: params.name?.trim(),
      contactInfo: params.contactInfo?.trim(),
      email: params.email?.trim(),
      phone: params.phone?.trim(),
      loyaltyPointsBalance: params.loyaltyPointsBalance,
      lifetimePointsEarned: params.lifetimePointsEarned,
      status: params.status,
    };

    // Remove undefined
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    const updatedCustomer = await customerService.update(id, updateData, user);

    return {
      status: true,
      message: "Customer updated successfully",
      data: updatedCustomer,
    };
  } catch (error) {
    console.error("Error in updateCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to update customer",
      data: null,
    };
  }
};

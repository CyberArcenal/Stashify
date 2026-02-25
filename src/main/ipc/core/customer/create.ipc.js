// src/main/ipc/customer/create.ipc.js

const customerService = require("../../../../services/Customer");

/**
 * Create a new customer
 * @param {Object} params - Request parameters
 * @param {string} params.name - Customer name (required)
 * @param {string} [params.contactInfo] - Contact information
 * @param {string} [params.email] - Email address
 * @param {string} [params.phone] - Phone number
 * @param {number} [params.loyaltyPointsBalance=0] - Initial loyalty points
 * @param {number} [params.lifetimePointsEarned=0] - Lifetime earned points
 * @param {string} [params.status='regular'] - Customer status ('regular', 'vip', 'elite')
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (
      !params.name ||
      typeof params.name !== "string" ||
      params.name.trim() === ""
    ) {
      return {
        status: false,
        message: "Customer name is required and must be a non-empty string.",
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

    // Prepare data
    const customerData = {
      name: params.name.trim(),
      contactInfo: params.contactInfo?.trim(),
      email: params.email?.trim(),
      phone: params.phone?.trim(),
      loyaltyPointsBalance:
        params.loyaltyPointsBalance !== undefined
          ? params.loyaltyPointsBalance
          : 0,
      lifetimePointsEarned:
        params.lifetimePointsEarned !== undefined
          ? params.lifetimePointsEarned
          : 0,
      status: params.status || "regular",
    };

    // Remove undefined
    Object.keys(customerData).forEach(
      (key) => customerData[key] === undefined && delete customerData[key],
    );

    const newCustomer = await customerService.create(customerData, user);

    return {
      status: true,
      message: "Customer created successfully",
      data: newCustomer,
    };
  } catch (error) {
    console.error("Error in createCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to create customer",
      data: null,
    };
  }
};

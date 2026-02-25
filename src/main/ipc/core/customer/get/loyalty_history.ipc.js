// src/main/ipc/customer/get/loyalty_history.ipc.js
// @ts-check

const LoyaltyTransaction = require("../../../../../entities/LoyaltyTransaction");
const { AppDataSource } = require("../../../../db/datasource");


/**
 * Get loyalty transaction history for a specific customer
 * @param {Object} params - Request parameters
 * @param {number} params.customerId - Customer ID
 * @param {number} [params.page] - Page number (1-based)
 * @param {number} [params.limit] - Items per page
 * @param {string} [params.sortBy='timestamp'] - Sort field
 * @param {string} [params.sortOrder='DESC'] - Sort order
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required customerId
    if (!params.customerId) {
      return {
        status: false,
        message: "Missing required parameter: customerId",
        data: null,
      };
    }

    const customerId = Number(params.customerId);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return {
        status: false,
        message: "Invalid customerId. Must be a positive integer.",
        data: null,
      };
    }

    // Validate pagination
    if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
      return {
        status: false,
        message: "Invalid page number. Must be a positive integer.",
        data: null,
      };
    }
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1)) {
      return {
        status: false,
        message: "Invalid limit. Must be a positive integer.",
        data: null,
      };
    }

    // Ensure AppDataSource initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const transactionRepo = AppDataSource.getRepository(LoyaltyTransaction);

    // Build query
    const qb = transactionRepo
      .createQueryBuilder("lt")
      .leftJoinAndSelect("lt.order", "order")
      .where("lt.customerId = :customerId", { customerId });

    const sortBy = params.sortBy || "timestamp";
    const sortOrder = params.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`lt.${sortBy}`, sortOrder);

    if (params.page && params.limit) {
      const skip = (params.page - 1) * params.limit;
      qb.skip(skip).take(params.limit);
    }

    const transactions = await qb.getMany();
    const total = await qb.getCount();

    return {
      status: true,
      message: "Loyalty history retrieved successfully",
      data: {
        items: transactions,
        total,
        page: params.page || 1,
        limit: params.limit || transactions.length,
      },
    };
  } catch (error) {
    console.error("Error in getCustomerLoyaltyHistory:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to retrieve loyalty history",
      data: null,
    };
  }
};
// src/main/ipc/customer/loyalty/redeem_points.ipc.js
const LoyaltyTransaction = require("../../../../../entities/LoyaltyTransaction");

/**
 * Redeem loyalty points from a customer
 * @param {Object} params - Request parameters
 * @param {number} params.customerId - Customer ID (required)
 * @param {number} params.points - Points to redeem (positive integer)
 * @param {string} [params.notes] - Optional notes
 * @param {number} [params.orderId] - Associated order ID
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.customerId) {
      return {
        status: false,
        message: "Missing required parameter: customerId",
        data: null,
      };
    }
    if (params.points === undefined || params.points === null) {
      return {
        status: false,
        message: "Missing required parameter: points",
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

    const points = Number(params.points);
    if (!Number.isInteger(points) || points <= 0) {
      return {
        status: false,
        message: "points must be a positive integer.",
        data: null,
      };
    }

    // Validate orderId if provided
    let orderId = null;
    if (params.orderId !== undefined && params.orderId !== null) {
      orderId = Number(params.orderId);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return {
          status: false,
          message: "Invalid orderId. Must be a positive integer.",
          data: null,
        };
      }
    }

    // Get repositories within transaction
    const customerRepo = queryRunner.manager.getRepository("Customer");
    const transactionRepo = queryRunner.manager.getRepository(LoyaltyTransaction);

    // Find customer
    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      return {
        status: false,
        message: `Customer with ID ${customerId} not found`,
        data: null,
      };
    }

    // Check sufficient balance
    if ((customer.loyaltyPointsBalance || 0) < points) {
      return {
        status: false,
        message: `Insufficient loyalty points. Current balance: ${customer.loyaltyPointsBalance}, requested: ${points}`,
        data: null,
      };
    }

    // Update customer points
    customer.loyaltyPointsBalance -= points;
    customer.updatedAt = new Date();
    await customerRepo.save(customer);

    // Create loyalty transaction
    const transaction = transactionRepo.create({
      customer: { id: customerId },
      order: orderId ? { id: orderId } : null,
      transactionType: "redeem",
      pointsChange: -points,
      notes: params.notes,
      timestamp: new Date(),
    });
    await transactionRepo.save(transaction);

    return {
      status: true,
      message: "Loyalty points redeemed successfully",
      data: {
        customer,
        transaction,
      },
    };
  } catch (error) {
    console.error("Error in redeemLoyaltyPoints:", error);
    return {
      status: false,
      message: error.message || "Failed to redeem loyalty points",
      data: null,
    };
  }
};
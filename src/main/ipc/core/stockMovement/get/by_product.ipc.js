// src/main/ipc/stockMovement/get/by_product.ipc.js


const StockMovement = require("../../../../../entities/StockMovement");
const auditLogger = require("../../../../../utils/auditLogger");
const { AppDataSource } = require("../../../../db/datasource");

/**
 * Get stock movements for a specific product
 * @param {Object} params - Request parameters
 * @param {number} params.productId - Product ID (required)
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 * @param {string} [params.sortBy='created_at'] - Sort field
 * @param {string} [params.sortOrder='DESC'] - Sort order
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required productId
    if (!params.productId) {
      return {
        status: false,
        message: "Missing required parameter: productId",
        data: null,
      };
    }

    const productId = Number(params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return {
        status: false,
        message: "Invalid productId. Must be a positive integer.",
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
    const movementRepo = AppDataSource.getRepository(StockMovement);

    // Build query: join stockItem and product
    const queryBuilder = movementRepo
      .createQueryBuilder("movement")
      .leftJoinAndSelect("movement.stockItem", "stockItem")
      .leftJoinAndSelect("stockItem.product", "product")
      .leftJoinAndSelect("movement.warehouse", "warehouse")
      .where("product.id = :productId", { productId })
      .andWhere("movement.is_deleted = false");

    const sortBy = params.sortBy || "created_at";
    const sortOrder = params.sortOrder === "ASC" ? "ASC" : "DESC";
    queryBuilder.orderBy(`movement.${sortBy}`, sortOrder);

    if (params.page && params.limit) {
      const skip = (params.page - 1) * params.limit;
      queryBuilder.skip(skip).take(params.limit);
    }

    const movements = await queryBuilder.getMany();

    // Get total count for pagination (optional, could be included in response)
    const total = await queryBuilder.getCount();

    await auditLogger.logView("StockMovement", null, "system");

    return {
      status: true,
      message: "Stock movements for product retrieved successfully",
      data: {
        items: movements,
        total,
        page: params.page || 1,
        limit: params.limit || movements.length,
      },
    };
  } catch (error) {
    console.error("Error in getMovementsByProduct:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve movements for product",
      data: null,
    };
  }
};
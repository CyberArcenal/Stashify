// src/main/ipc/productVariant/sync_stock.ipc.js
// @ts-check
const { AppDataSource } = require("../../../db/datasource");
const ProductVariant = require("../../../../entities/ProductVariant");
const StockItem = require("../../../../entities/StockItem");
const auditLogger = require("../../../../utils/auditLogger");

/**
 * Synchronize stock for a variant (e.g., recalculate total quantity across warehouses)
 * @param {Object} params - Request parameters
 * @param {number} params.variantId - Variant ID (required)
 * @param {number} [params.warehouseId] - Specific warehouse ID (optional)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required variantId
    if (!params.variantId) {
      return {
        status: false,
        message: "Missing required parameter: variantId",
        data: null,
      };
    }

    const variantId = Number(params.variantId);
    if (!Number.isInteger(variantId) || variantId <= 0) {
      return {
        status: false,
        message: "Invalid variantId. Must be a positive integer.",
        data: null,
      };
    }

    // Validate optional warehouseId
    let warehouseId = null;
    if (params.warehouseId !== undefined) {
      warehouseId = Number(params.warehouseId);
      if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
        return {
          status: false,
          message: "Invalid warehouseId. Must be a positive integer.",
          data: null,
        };
      }
    }

    // Get repositories from query runner
    const variantRepo = queryRunner.manager.getRepository(ProductVariant);
    const stockRepo = queryRunner.manager.getRepository(StockItem);

    // Find the variant
    const variant = await variantRepo.findOne({
      where: { id: variantId, is_deleted: false },
    });
    if (!variant) {
      return {
        status: false,
        message: `Product variant with ID ${variantId} not found or deleted.`,
        data: null,
      };
    }

    // Build stock query
    const stockQuery = stockRepo
      .createQueryBuilder("stock")
      .where("stock.variantId = :variantId", { variantId })
      .andWhere("stock.is_deleted = false");

    if (warehouseId) {
      stockQuery.andWhere("stock.warehouseId = :warehouseId", { warehouseId });
    }

    const stockItems = await stockQuery.getMany();

    // Calculate total quantity
    const totalQuantity = stockItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // Here you could update a hypothetical 'total_stock' field on variant if it exists
    // For now, we just return the synced data

    // Log the sync action
    await auditLogger.logUpdate(
      "ProductVariant",
      variantId,
      { sync: "before" },
      { totalQuantity, warehouseCount: stockItems.length },
      user,
    );

    return {
      status: true,
      message: "Stock synchronized successfully",
      data: {
        variantId,
        totalQuantity,
        warehouseCount: stockItems.length,
        stockItems,
      },
    };
  } catch (error) {
    console.error("Error in syncVariantStock:", error);
    return {
      status: false,
      message: error.message || "Failed to sync stock",
      data: null,
    };
  }
};

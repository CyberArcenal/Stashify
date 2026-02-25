// src/subscribers/ProductSubscriber.js
// @ts-check
const Product = require("../entities/Product");
const Warehouse = require("../entities/Warehouse");
const StockItem = require("../entities/StockItem");
const { AppDataSource } = require("../main/db/datasource");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading ProductSubscriber");

class ProductSubscriber {
  listenTo() {
    return Product;
  }

  /**
   * @param {any} entity
   */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductSubscriber] beforeInsert error", err);
    }
  }

  /**
   * @param {Product} entity
   */
  async afterInsert(entity) {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    try {
      // @ts-ignore
      logger.info("[ProductSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });

      // Ensure AppDataSource is initialized
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const stockItemRepo = AppDataSource.getRepository(StockItem);

      // Kunin ang lahat ng active warehouses
      const warehouses = await warehouseRepo.find({
        where: { is_deleted: false, is_active: true },
      });

      for (const warehouse of warehouses) {
        // Tingnan kung may existing StockItem para sa product na ito (walang variant)
        const existing = await stockItemRepo.findOne({
          where: {
            // @ts-ignore
            product: { id: entity.id },
            variant: null,
            warehouse: { id: warehouse.id },
          },
        });

        if (!existing) {
          // Gumawa ng bagong StockItem na may quantity = 0
          const stockItem = stockItemRepo.create({
            // @ts-ignore
            product: entity,
            warehouse,
            quantity: 0,
            reorder_level: 0,
            low_stock_threshold: null,
          });
          // @ts-ignore
          await saveDb(stockItemRepo, stockItem);
          // @ts-ignore
          logger.info(`[ProductSubscriber] Created StockItem for product ${entity.id} in warehouse ${warehouse.id}`);
        }
      }
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductSubscriber] afterInsert error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductSubscriber] beforeUpdate error", err);
    }
  }

  /**
   * @param {{ entity: any; }} event
   */
  async afterUpdate(event) {
    try {
      const { entity } = event;
      // @ts-ignore
      logger.info("[ProductSubscriber] afterUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductSubscriber] afterUpdate error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductSubscriber] beforeRemove error", err);
    }
  }

  /**
   * @param {any} event
   */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[ProductSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductSubscriber] afterRemove error", err);
    }
  }
}

module.exports = ProductSubscriber;
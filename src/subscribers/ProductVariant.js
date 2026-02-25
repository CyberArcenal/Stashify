// src/subscribers/ProductVariantSubscriber.js
// @ts-check
const ProductVariant = require("../entities/ProductVariant");
const Warehouse = require("../entities/Warehouse");
const StockItem = require("../entities/StockItem");
const { AppDataSource } = require("../main/db/datasource");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading ProductVariantSubscriber");

class ProductVariantSubscriber {
  listenTo() {
    return ProductVariant;
  }

  /**
   * @param {any} entity
   */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductVariantSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductVariantSubscriber] beforeInsert error", err);
    }
  }

  /**
   * @param {ProductVariant} entity
   */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductVariantSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });

      // Ensure AppDataSource is initialized
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      // Kailangan nating makuha ang product ID ng variant na ito.
      // Ang entity ay maaaring may product relation (kung ito ay na-save na may product).
      // Kung wala, kukunin natin mula sa database.
      // @ts-ignore
      let productId = entity.product?.id;
      if (!productId) {
        // I-reload ang variant kasama ang product relation
        const variantRepo = AppDataSource.getRepository(ProductVariant);
        const fullVariant = await variantRepo.findOne({
          // @ts-ignore
          where: { id: entity.id },
          relations: ["product"],
        });
        // @ts-ignore
        if (fullVariant?.product) {
          // @ts-ignore
          productId = fullVariant.product.id;
        } else {
          // @ts-ignore
          logger.error("[ProductVariantSubscriber] Could not determine productId for variant", entity.id);
          return;
        }
      }

      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const stockItemRepo = AppDataSource.getRepository(StockItem);

      // Kunin ang lahat ng active warehouses
      const warehouses = await warehouseRepo.find({
        where: { is_deleted: false, is_active: true },
      });

      for (const warehouse of warehouses) {
        // Tingnan kung may existing StockItem para sa variant na ito
        const existing = await stockItemRepo.findOne({
          where: {
            // @ts-ignore
            product: { id: productId },
            // @ts-ignore
            variant: { id: entity.id },
            warehouse: { id: warehouse.id },
          },
        });

        if (!existing) {
          // Gumawa ng bagong StockItem na may quantity = 0
          const stockItem = stockItemRepo.create({
            // @ts-ignore
            product: { id: productId },
            variant: entity,
            warehouse,
            quantity: 0,
            reorder_level: 0,
            low_stock_threshold: null,
          });
          await stockItemRepo.save(stockItem);
          // @ts-ignore
          logger.info(`[ProductVariantSubscriber] Created StockItem for variant ${entity.id} in warehouse ${warehouse.id}`);
        }
      }
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductVariantSubscriber] afterInsert error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductVariantSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductVariantSubscriber] beforeUpdate error", err);
    }
  }

  /**
   * @param {{ entity: any; }} event
   */
  async afterUpdate(event) {
    try {
      const { entity } = event;
      // @ts-ignore
      logger.info("[ProductVariantSubscriber] afterUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductVariantSubscriber] afterUpdate error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductVariantSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductVariantSubscriber] beforeRemove error", err);
    }
  }

  /**
   * @param {any} event
   */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[ProductVariantSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[ProductVariantSubscriber] afterRemove error", err);
    }
  }
}

module.exports = ProductVariantSubscriber;
// src/subscribers/ProductSubscriber.js
// @ts-check
const Product = require("../entities/Product");
const { AppDataSource } = require("../main/db/datasource");
const { logger } = require("../utils/logger");
const {
  ProductStateTransitionService,
} = require("../stateTransitionServices/Product");

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
   * @param {{ id: any; }} entity
   */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });

      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const productRepo = AppDataSource.getRepository(Product);
      const product = await productRepo.findOne({ where: { id: entity.id } });
      if (!product) return;

      const transitionService = new ProductStateTransitionService(
        AppDataSource,
      );
      // @ts-ignore
      await transitionService.onAfterInsert(product, "system");
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
   * @param {{ databaseEntity: any; entity: any; }} event
   */

  async afterUpdate(event) {
    try {
      const { databaseEntity: oldEntity, entity: newEntity } = event;

      // @ts-ignore
      logger.info("[ProductSubscriber] afterUpdate started", {
        id: newEntity.id,
      });

      // Kunin ang tax IDs – direkta mula sa event (huwag nang mag-query)
      // @ts-ignore
      const oldTaxIds = (oldEntity.taxes || []).map((t) => t.id).sort();
      // @ts-ignore
      const newTaxIds = (newEntity.taxes || []).map((t) => t.id).sort();

      // @ts-ignore
      logger.info("[ProductSubscriber] Tax comparison", {
        old: oldTaxIds,
        new: newTaxIds,
      });

      if (JSON.stringify(oldTaxIds) !== JSON.stringify(newTaxIds)) {
        logger.info(
          `[ProductSubscriber] Taxes changed for product ${newEntity.id}`,
        );

        const transitionService = new ProductStateTransitionService(
          AppDataSource,
        );
        await transitionService.onTaxesChanged(
          newEntity,
          oldEntity.taxes || [],
          newEntity.taxes || [],
          "system",
          { reason: "Product taxes updated via product edit" },
        );
      } else {
        logger.info(
          `[ProductSubscriber] No tax change detected for product ${newEntity.id}`,
        );
      }
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

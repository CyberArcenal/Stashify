// src/subscribers/ProductVariantSubscriber.js
// @ts-check
const ProductVariant = require("../entities/ProductVariant");
const { AppDataSource } = require("../main/db/datasource");
const { logger } = require("../utils/logger");
const {
  VariantStateTransitionService,
} = require("../stateTransitionServices/Variant");

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
   * @param {{ id: any; }} entity
   */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[ProductVariantSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });

      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const variantRepo = AppDataSource.getRepository(ProductVariant);
      const variant = await variantRepo.findOne({
        where: { id: entity.id },
        relations: ["product"],
      });
      if (!variant) return;

      const transitionService = new VariantStateTransitionService(
        AppDataSource,
      );
      // @ts-ignore
      await transitionService.onAfterInsert(variant, "system");
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
   * @param {{ databaseEntity: any; entity: any; }} event
   */

  async afterUpdate(event) {
    try {
      const { databaseEntity: oldEntity, entity: newEntity } = event;

      // @ts-ignore
      logger.info("[ProductVariantSubscriber] afterUpdate started", {
        id: newEntity.id,
      });

      // ✅ HUWAG NANG MAG-QUERY – gamitin ang oldEntity at newEntity mula sa event
      const oldTaxIds = (oldEntity.taxes || []).map((/** @type {{ id: any; }} */ t) => t.id).sort();
      const newTaxIds = (newEntity.taxes || []).map((/** @type {{ id: any; }} */ t) => t.id).sort();

      // @ts-ignore
      logger.info("[ProductVariantSubscriber] Tax comparison", {
        old: oldTaxIds,
        new: newTaxIds,
      });

      if (JSON.stringify(oldTaxIds) !== JSON.stringify(newTaxIds)) {
        logger.info(
          `[ProductVariantSubscriber] Taxes changed for variant ${newEntity.id}`,
        );

        const transitionService = new VariantStateTransitionService(
          AppDataSource,
        );
        await transitionService.onTaxesChanged(
          // @ts-ignore
          newEntity,
          // @ts-ignore
          oldEntity.taxes || [],
          // @ts-ignore
          newEntity.taxes || [],
          "system",
          { reason: "Variant taxes updated via variant edit" },
        );
      } else {
        logger.info(
          `[ProductVariantSubscriber] No tax change detected for variant ${newEntity.id}`,
        );
      }
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

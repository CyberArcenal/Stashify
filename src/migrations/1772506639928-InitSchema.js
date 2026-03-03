/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class InitSchema1772506639928 {
    name = 'InitSchema1772506639928'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_2386ba8f549f3e55653f4147fb"`);
        await queryRunner.query(`DROP INDEX "IDX_25e09a148822d3983ca09b1116"`);
        await queryRunner.query(`CREATE TABLE "temporary_product_taxes" ("productId" integer NOT NULL, "taxId" integer NOT NULL, CONSTRAINT "FK_25e09a148822d3983ca09b11160" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_2386ba8f549f3e55653f4147fb3" FOREIGN KEY ("taxId") REFERENCES "taxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "taxId"))`);
        await queryRunner.query(`INSERT INTO "temporary_product_taxes"("productId", "taxId") SELECT "productId", "taxId" FROM "product_taxes"`);
        await queryRunner.query(`DROP TABLE "product_taxes"`);
        await queryRunner.query(`ALTER TABLE "temporary_product_taxes" RENAME TO "product_taxes"`);
        await queryRunner.query(`CREATE INDEX "IDX_2386ba8f549f3e55653f4147fb" ON "product_taxes" ("taxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_25e09a148822d3983ca09b1116" ON "product_taxes" ("productId") `);
        await queryRunner.query(`DROP INDEX "IDX_2386ba8f549f3e55653f4147fb"`);
        await queryRunner.query(`DROP INDEX "IDX_25e09a148822d3983ca09b1116"`);
        await queryRunner.query(`CREATE TABLE "temporary_product_taxes" ("productId" integer NOT NULL, "taxId" integer NOT NULL, CONSTRAINT "FK_2386ba8f549f3e55653f4147fb3" FOREIGN KEY ("taxId") REFERENCES "taxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "taxId"))`);
        await queryRunner.query(`INSERT INTO "temporary_product_taxes"("productId", "taxId") SELECT "productId", "taxId" FROM "product_taxes"`);
        await queryRunner.query(`DROP TABLE "product_taxes"`);
        await queryRunner.query(`ALTER TABLE "temporary_product_taxes" RENAME TO "product_taxes"`);
        await queryRunner.query(`CREATE INDEX "IDX_2386ba8f549f3e55653f4147fb" ON "product_taxes" ("taxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_25e09a148822d3983ca09b1116" ON "product_taxes" ("productId") `);
        await queryRunner.query(`DROP INDEX "idx_notifications_created"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_user_read"`);
        await queryRunner.query(`CREATE TABLE "temporary_notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "title" varchar(255) NOT NULL, "message" text NOT NULL, "type" varchar CHECK( "type" IN ('info','success','warning','error','purchase','sale') ) NOT NULL DEFAULT ('info'), "isRead" boolean NOT NULL DEFAULT (0), "metadata" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "temporary_notifications"("id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt") SELECT "id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt" FROM "notifications"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`ALTER TABLE "temporary_notifications" RENAME TO "notifications"`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_created" ON "notifications" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("userId", "isRead") `);
        await queryRunner.query(`DROP INDEX "IDX_2386ba8f549f3e55653f4147fb"`);
        await queryRunner.query(`DROP INDEX "IDX_25e09a148822d3983ca09b1116"`);
        await queryRunner.query(`CREATE TABLE "temporary_product_taxes" ("productId" integer NOT NULL, "taxId" integer NOT NULL, CONSTRAINT "FK_2386ba8f549f3e55653f4147fb3" FOREIGN KEY ("taxId") REFERENCES "taxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_25e09a148822d3983ca09b11160" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "taxId"))`);
        await queryRunner.query(`INSERT INTO "temporary_product_taxes"("productId", "taxId") SELECT "productId", "taxId" FROM "product_taxes"`);
        await queryRunner.query(`DROP TABLE "product_taxes"`);
        await queryRunner.query(`ALTER TABLE "temporary_product_taxes" RENAME TO "product_taxes"`);
        await queryRunner.query(`CREATE INDEX "IDX_2386ba8f549f3e55653f4147fb" ON "product_taxes" ("taxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_25e09a148822d3983ca09b1116" ON "product_taxes" ("productId") `);
        await queryRunner.query(`DROP INDEX "IDX_2386ba8f549f3e55653f4147fb"`);
        await queryRunner.query(`DROP INDEX "IDX_25e09a148822d3983ca09b1116"`);
        await queryRunner.query(`CREATE TABLE "temporary_product_taxes" ("productId" integer NOT NULL, "taxId" integer NOT NULL, CONSTRAINT "FK_2386ba8f549f3e55653f4147fb3" FOREIGN KEY ("taxId") REFERENCES "taxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_25e09a148822d3983ca09b11160" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_25e09a148822d3983ca09b11160" FOREIGN KEY ("productId") REFERENCES "product_variants" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "taxId"))`);
        await queryRunner.query(`INSERT INTO "temporary_product_taxes"("productId", "taxId") SELECT "productId", "taxId" FROM "product_taxes"`);
        await queryRunner.query(`DROP TABLE "product_taxes"`);
        await queryRunner.query(`ALTER TABLE "temporary_product_taxes" RENAME TO "product_taxes"`);
        await queryRunner.query(`CREATE INDEX "IDX_2386ba8f549f3e55653f4147fb" ON "product_taxes" ("taxId") `);
        await queryRunner.query(`CREATE INDEX "IDX_25e09a148822d3983ca09b1116" ON "product_taxes" ("productId") `);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_25e09a148822d3983ca09b1116"`);
        await queryRunner.query(`DROP INDEX "IDX_2386ba8f549f3e55653f4147fb"`);
        await queryRunner.query(`ALTER TABLE "product_taxes" RENAME TO "temporary_product_taxes"`);
        await queryRunner.query(`CREATE TABLE "product_taxes" ("productId" integer NOT NULL, "taxId" integer NOT NULL, CONSTRAINT "FK_2386ba8f549f3e55653f4147fb3" FOREIGN KEY ("taxId") REFERENCES "taxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_25e09a148822d3983ca09b11160" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "taxId"))`);
        await queryRunner.query(`INSERT INTO "product_taxes"("productId", "taxId") SELECT "productId", "taxId" FROM "temporary_product_taxes"`);
        await queryRunner.query(`DROP TABLE "temporary_product_taxes"`);
        await queryRunner.query(`CREATE INDEX "IDX_25e09a148822d3983ca09b1116" ON "product_taxes" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2386ba8f549f3e55653f4147fb" ON "product_taxes" ("taxId") `);
        await queryRunner.query(`DROP INDEX "IDX_25e09a148822d3983ca09b1116"`);
        await queryRunner.query(`DROP INDEX "IDX_2386ba8f549f3e55653f4147fb"`);
        await queryRunner.query(`ALTER TABLE "product_taxes" RENAME TO "temporary_product_taxes"`);
        await queryRunner.query(`CREATE TABLE "product_taxes" ("productId" integer NOT NULL, "taxId" integer NOT NULL, CONSTRAINT "FK_2386ba8f549f3e55653f4147fb3" FOREIGN KEY ("taxId") REFERENCES "taxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "taxId"))`);
        await queryRunner.query(`INSERT INTO "product_taxes"("productId", "taxId") SELECT "productId", "taxId" FROM "temporary_product_taxes"`);
        await queryRunner.query(`DROP TABLE "temporary_product_taxes"`);
        await queryRunner.query(`CREATE INDEX "IDX_25e09a148822d3983ca09b1116" ON "product_taxes" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2386ba8f549f3e55653f4147fb" ON "product_taxes" ("taxId") `);
        await queryRunner.query(`DROP INDEX "idx_notifications_user_read"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_created"`);
        await queryRunner.query(`ALTER TABLE "notifications" RENAME TO "temporary_notifications"`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "title" varchar(255) NOT NULL, "message" text NOT NULL, "type" varchar CHECK( "type" IN ('info','success','warning','error','purchase','sale') ) NOT NULL DEFAULT ('info'), "isRead" boolean NOT NULL DEFAULT (0), "metadata" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "notifications"("id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt") SELECT "id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt" FROM "temporary_notifications"`);
        await queryRunner.query(`DROP TABLE "temporary_notifications"`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("userId", "isRead") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_created" ON "notifications" ("createdAt") `);
        await queryRunner.query(`DROP INDEX "IDX_25e09a148822d3983ca09b1116"`);
        await queryRunner.query(`DROP INDEX "IDX_2386ba8f549f3e55653f4147fb"`);
        await queryRunner.query(`ALTER TABLE "product_taxes" RENAME TO "temporary_product_taxes"`);
        await queryRunner.query(`CREATE TABLE "product_taxes" ("productId" integer NOT NULL, "taxId" integer NOT NULL, CONSTRAINT "FK_25e09a148822d3983ca09b11160" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_2386ba8f549f3e55653f4147fb3" FOREIGN KEY ("taxId") REFERENCES "taxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "taxId"))`);
        await queryRunner.query(`INSERT INTO "product_taxes"("productId", "taxId") SELECT "productId", "taxId" FROM "temporary_product_taxes"`);
        await queryRunner.query(`DROP TABLE "temporary_product_taxes"`);
        await queryRunner.query(`CREATE INDEX "IDX_25e09a148822d3983ca09b1116" ON "product_taxes" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2386ba8f549f3e55653f4147fb" ON "product_taxes" ("taxId") `);
        await queryRunner.query(`DROP INDEX "IDX_25e09a148822d3983ca09b1116"`);
        await queryRunner.query(`DROP INDEX "IDX_2386ba8f549f3e55653f4147fb"`);
        await queryRunner.query(`ALTER TABLE "product_taxes" RENAME TO "temporary_product_taxes"`);
        await queryRunner.query(`CREATE TABLE "product_taxes" ("productId" integer NOT NULL, "taxId" integer NOT NULL, CONSTRAINT "FK_25e09a148822d3983ca09b11160" FOREIGN KEY ("productId") REFERENCES "product_variants" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_25e09a148822d3983ca09b11160" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_2386ba8f549f3e55653f4147fb3" FOREIGN KEY ("taxId") REFERENCES "taxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productId", "taxId"))`);
        await queryRunner.query(`INSERT INTO "product_taxes"("productId", "taxId") SELECT "productId", "taxId" FROM "temporary_product_taxes"`);
        await queryRunner.query(`DROP TABLE "temporary_product_taxes"`);
        await queryRunner.query(`CREATE INDEX "IDX_25e09a148822d3983ca09b1116" ON "product_taxes" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2386ba8f549f3e55653f4147fb" ON "product_taxes" ("taxId") `);
    }
}

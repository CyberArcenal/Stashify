const { EntitySchema } = require("typeorm");

const PurchaseItem = new EntitySchema({
  name: "PurchaseItem",
  tableName: "purchase_items",
  columns: {
    id: { type: Number, primary: true, generated: true },
    quantity: { type: Number, nullable: false, check: "quantity >= 0" },
    unit_cost: { type: Number, default: 0, nullable: false },
    total: { type: Number, default: 0, nullable: false }, // unit_cost * quantity
    created_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    updated_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    is_deleted: { type: Boolean, default: false, nullable: false },
  },
  relations: {
    purchase: {
      target: "Purchase",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "items",
    },
    product: {
      target: "Product",
      type: "many-to-one",
      onDelete: "RESTRICT",
      inverseSide: "purchaseItems",
    },
    variant: {
      target: "ProductVariant",
      type: "many-to-one",
      onDelete: "RESTRICT",
      inverseSide: "purchaseItems",
    },
  },
});

module.exports = PurchaseItem;
const { EntitySchema } = require("typeorm");

const StockItem = new EntitySchema({
  name: "StockItem",
  tableName: "stock_items",
  columns: {
    id: { type: Number, primary: true, generated: true },
    productId: { type: Number },
    variantId: { type: Number, nullable: true },
    warehouseId: { type: Number },
    quantity: { type: Number, default: 0, nullable: false },
    reorder_level: { type: Number, default: 0, nullable: false },
    low_stock_threshold: { type: Number, nullable: true },
    created_at: {
      type: Date,
      default: () => "CURRENT_TIMESTAMP",
      nullable: false,
    },
    updated_at: {
      type: Date,
      default: () => "CURRENT_TIMESTAMP",
      nullable: false,
    },
    is_deleted: { type: Boolean, default: false, nullable: false },
  },
  uniques: [
    { columns: ["productId", "variantId", "warehouseId"] }, // relies on naming strategy
  ],
  relations: {
    product: {
      target: "Product",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "stockItems",
    },
    variant: {
      target: "ProductVariant",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "stockItems",
    },
    warehouse: {
      target: "Warehouse",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "stockItems",
    },
    movements: {
      target: "StockMovement",
      type: "one-to-many",
      mappedBy: "stockItem",
    },
  },
});

module.exports = StockItem;

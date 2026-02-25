const { EntitySchema } = require("typeorm");

const StockMovement = new EntitySchema({
  name: "StockMovement",
  tableName: "stock_movements",
  columns: {
    id: { type: Number, primary: true, generated: true },
    change: { type: Number, nullable: false },
    movement_type: {
      type: String,
      nullable: true,
      check: "movement_type IN ('in','out','transfer_out','transfer_in','adjustment')",
    },
    reference_code: { type: String, nullable: false },
    reason: { type: String, nullable: true },
    metadata: { type: String, nullable: true }, // JSON stored as TEXT
    current_quantity: { type: Number, default: 0, nullable: true },
    created_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    updated_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    is_deleted: { type: Boolean, default: false, nullable: false },
  },
  relations: {
    stockItem: {
      target: "StockItem",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "movements",
    },
    warehouse: {
      target: "Warehouse",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "stockMovements",
    },
  },
});

module.exports = StockMovement;
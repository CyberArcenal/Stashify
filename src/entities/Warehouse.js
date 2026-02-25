const { EntitySchema } = require("typeorm");

const Warehouse = new EntitySchema({
  name: "Warehouse",
  tableName: "warehouses",
  columns: {
    id: { type: Number, primary: true, generated: true },
    type: {
      type: String,
      default: "warehouse",
      nullable: false,
      check: "type IN ('warehouse','store','online')",
    },
    name: { type: String, nullable: false },
    location: { type: String, nullable: true },
    limit_capacity: { type: "int", nullable: false, default: 0 },
    is_active: { type: Boolean, default: true, nullable: false },
    created_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    updated_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    is_deleted: { type: Boolean, default: false, nullable: false },
  },
  uniques: [{ columns: ["name", "location"] }],
  relations: {
    stockItems: {
      target: "StockItem",
      type: "one-to-many",
      mappedBy: "warehouse",
    },
    stockMovements: {
      target: "StockMovement",
      type: "one-to-many",
      mappedBy: "warehouse",
    },
    purchases: {
      target: "Purchase",
      type: "one-to-many",
      mappedBy: "warehouse",
    },
    orderItems: {
      target: "OrderItem",
      type: "one-to-many",
      mappedBy: "warehouse",
    },
  },
});

module.exports = Warehouse;
const { EntitySchema } = require("typeorm");

const Purchase = new EntitySchema({
  name: "Purchase",
  tableName: "purchases",
  columns: {
    id: { type: Number, primary: true, generated: true },
    purchase_number: { type: String, nullable: false, unique: true },
    status: {
      type: String,
      default: "pending",
      nullable: false,
      check: "status IN ('initiated','pending','confirmed','received','cancelled')",
    },
    subtotal: { type: Number, default: 0, nullable: false },
    tax_amount: { type: Number, default: 0, nullable: false },
    total: { type: Number, default: 0, nullable: false },
    notes: { type: String, nullable: true },
    inventory_processed: { type: Boolean, default: false, nullable: false },
    is_received: { type: Boolean, default: false, nullable: false },
    received_at: { type: Date, nullable: true },
    proceed_by: { type: Number, nullable: true }, // user ID
    created_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    updated_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    is_deleted: { type: Boolean, default: false, nullable: false },
  },
  relations: {
    supplier: {
      target: "Supplier",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "purchases",
    },
    warehouse: {
      target: "Warehouse",
      type: "many-to-one",
      onDelete: "RESTRICT",
      inverseSide: "purchases",
    },
    items: {
      target: "PurchaseItem",
      type: "one-to-many",
      mappedBy: "purchase",
    },
  },
});

module.exports = Purchase;
const { EntitySchema } = require("typeorm");

const Supplier = new EntitySchema({
  name: "Supplier",
  tableName: "suppliers",
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String, nullable: false, unique: true },
    contact_person: { type: String, nullable: true },
    email: { type: String, nullable: true },
    phone: { type: String, nullable: true },
    address: { type: String, nullable: true },
    tax_id: { type: String, nullable: true },
    notes: { type: String, nullable: true },
    status: {
      type: String,
      default: "pending",
      nullable: false,
      check: "status IN ('pending','approved','rejected')",
    },
    is_active: { type: Boolean, default: true, nullable: false },
    is_deleted: { type: Boolean, default: false, nullable: false },
    created_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    updated_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
  },
  relations: {
    purchases: {
      target: "Purchase",
      type: "one-to-many",
      mappedBy: "supplier",
    },
  },
});

module.exports = Supplier;
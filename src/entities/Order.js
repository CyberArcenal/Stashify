const { EntitySchema } = require("typeorm");

const Order = new EntitySchema({
  name: "Order",
  tableName: "orders",
  columns: {
    id: { type: Number, primary: true, generated: true },
    order_number: { type: String, nullable: false, unique: true },
    status: {
      type: String,
      default: "pending",
      nullable: false,
      check:
        "status IN ('initiated','pending','confirmed','completed','cancelled','refunded')",
    },
    subtotal: { type: Number, default: 0, nullable: false },
    tax_amount: { type: Number, default: 0, nullable: false },
    total: { type: Number, default: 0, nullable: false },
    notes: { type: String, nullable: true },
    inventory_processed: { type: Boolean, default: false, nullable: false },
    tax_breakdown: { type: "simple-json", nullable: true },
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

    // Loyalty & Discount Fields (aligned with Sale)
    usedLoyalty: { type: Boolean, default: false, nullable: false },
    loyaltyRedeemed: { type: Number, default: 0, nullable: false },
    usedDiscount: { type: Boolean, default: false, nullable: false },
    totalDiscount: { type: Number, default: 0, nullable: false },
    usedVoucher: { type: Boolean, default: false, nullable: false },
    voucherCode: { type: String, nullable: true },
    pointsEarn: { type: Number, default: 0, nullable: false },
  },
  relations: {
    customer: {
      target: "Customer",
      type: "many-to-one",
      onDelete: "SET NULL",
      inverseSide: "sales",
    },
    items: {
      target: "OrderItem",
      type: "one-to-many",
      inverseSide: "order",
    },
  },
});

module.exports = Order;

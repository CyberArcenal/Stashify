const { EntitySchema } = require("typeorm");

const Customer = new EntitySchema({
  name: "Customer",
  tableName: "customers",
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String },
    contactInfo: { type: String, nullable: true },
    email: { type: String, nullable: true },
    phone: { type: String, nullable: true },
    loyaltyPointsBalance: { type: Number, default: 0 },
    lifetimePointsEarned: { type: Number, default: 0 },
    status: { type: String, default: "regular", enum: ["regular", "vip", "elite"] },
    createdAt: { type: Date, default: () => "CURRENT_TIMESTAMP" },
    updatedAt: { type: Date, nullable: true },
  },
  relations: {
    order: {
      target: "Order",
      type: "one-to-many",
      inverseSide: "customer",
    },
    loyaltyTransactions: {
      target: "LoyaltyTransaction",
      type: "one-to-many",
      inverseSide: "customer",
    },
  },
});

module.exports = Customer;
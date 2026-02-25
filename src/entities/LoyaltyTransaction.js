const { EntitySchema } = require("typeorm");

const LoyaltyTransaction = new EntitySchema({
  name: "LoyaltyTransaction",
  tableName: "loyalty_transactions",
  columns: {
    id: { type: Number, primary: true, generated: true },
    transactionType: {
      type: "varchar",
      enum: ["earn", "redeem", "refund"],
      default: "earn",
    },
    pointsChange: { type: Number },
    timestamp: { type: Date, default: () => "CURRENT_TIMESTAMP" },
    notes: { type: String, nullable: true },
    updatedAt: { type: Date, nullable: true },
  },
  relations: {
    customer: {
      target: "Customer",
      type: "many-to-one",
      inverseSide: "loyaltyTransactions",
    },
    order: {
      target: "Order",
      type: "many-to-one",
      nullable: true,
      inverseSide: "loyaltyTransactions",
    },
  },
});

module.exports = LoyaltyTransaction;
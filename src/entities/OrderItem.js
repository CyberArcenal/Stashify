const { EntitySchema } = require("typeorm");

const OrderItem = new EntitySchema({
  name: "OrderItem",
  tableName: "order_items",
  columns: {
    id: { type: Number, primary: true, generated: true },
    quantity: { type: Number, nullable: false },
    unit_price: { type: Number, nullable: false }, // net price per unit
    discount_amount: { type: Number, default: 0, nullable: false }, // line discount
    tax_rate: { type: Number, default: 0, nullable: false }, // e.g., 0.20 for 20%
    line_net_total: { type: Number, nullable: false }, // (unit_price * quantity) - discount
    line_tax_total: { type: Number, nullable: false }, // line_net_total * tax_rate
    line_gross_total: { type: Number, nullable: false }, // line_net_total + line_tax_total
    created_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    updated_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    is_deleted: { type: Boolean, default: false, nullable: false },
  },
  relations: {
    order: {
      target: "Order",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "items",
    },
    product: {
      target: "Product",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "orderItems",
    },
    variant: {
      target: "ProductVariant",
      type: "many-to-one",
      onDelete: "SET NULL",
      inverseSide: "orderItems",
    },
    warehouse: {
      target: "Warehouse",
      type: "many-to-one",
      onDelete: "SET NULL",
      inverseSide: "orderItems",
    },
  },
});

module.exports = OrderItem;
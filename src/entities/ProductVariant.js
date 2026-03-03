const { EntitySchema } = require("typeorm");

const ProductVariant = new EntitySchema({
  name: "ProductVariant",
  tableName: "product_variants",
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String, nullable: false },
    sku: { type: String, nullable: true, unique: true },
    gross_price: { type: Number, nullable: true },
    net_price: { type: Number, nullable: true },
    cost_per_item: { type: Number, nullable: true },
    barcode: { type: String, nullable: true, unique: true },
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
    is_active: { type: Boolean, default: true, nullable: false },
  },
  relations: {
    product: {
      target: "Product",
      type: "many-to-one",
      joinColumn: { name: "productId" }, // 👈 add this
      onDelete: "CASCADE",
      inverseSide: "variants",
    },
    stockItems: {
      target: "StockItem",
      type: "one-to-many",
      inverseSide: "variant", // 👈 replace mappedBy
    },
    orderItems: {
      target: "OrderItem",
      type: "one-to-many",
      inverseSide: "variant",
    },
    purchaseItems: {
      target: "PurchaseItem",
      type: "one-to-many",
      inverseSide: "variant",
    },
      purchaseTaxes: {
      target: "Tax",
      type: "many-to-many",
      joinTable: { name: "product_purchase_taxes" },
    },
    taxes: {
      target: "Tax",
      type: "many-to-many",
      joinTable: {
        name: "product_taxes",
        joinColumn: { name: "productId", referencedColumnName: "id" },
        inverseJoinColumn: { name: "taxId", referencedColumnName: "id" },
      },
    },
  },
});

module.exports = ProductVariant;

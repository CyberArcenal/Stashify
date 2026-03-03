const { EntitySchema } = require("typeorm");

const Product = new EntitySchema({
  name: "Product",
  tableName: "products",
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String, nullable: false },
    slug: { type: String, nullable: true, unique: true },
    description: { type: String, nullable: true },
    gross_price: { type: Number, nullable: true },
    net_price: { type: Number, nullable: true },
    cost_per_item: { type: Number, nullable: true },
    track_quantity: { type: Boolean, default: true, nullable: false },
    allow_backorder: { type: Boolean, default: false, nullable: false },
    compare_price: { type: Number, nullable: true },
    sku: { type: String, nullable: true, unique: true },
    barcode: { type: String, nullable: true },
    weight: { type: Number, nullable: true },
    dimensions: { type: String, nullable: true },
    is_published: { type: Boolean, default: false, nullable: false },
    published_at: { type: Date, nullable: true },
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
    category: {
      target: "Category",
      type: "many-to-one",
      onDelete: "SET NULL",
      joinColumn: { name: "categoryId" },
      inverseSide: "products",
    },
    variants: {
      target: "ProductVariant",
      type: "one-to-many",
      inverseSide: "product",
    },
    images: {
      target: "ProductImage",
      type: "one-to-many",
      inverseSide: "product",
    },
    stockItems: {
      target: "StockItem",
      type: "one-to-many",
      inverseSide: "product",
    },
    orderItems: {
      target: "OrderItem",
      type: "one-to-many",
      inverseSide: "product",
    },
    purchaseItems: {
      target: "PurchaseItem",
      type: "one-to-many",
      inverseSide: "product",
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

module.exports = Product;

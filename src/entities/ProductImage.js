const { EntitySchema } = require("typeorm");

const ProductImage = new EntitySchema({
  name: "ProductImage",
  tableName: "product_images",
  columns: {
    id: { type: Number, primary: true, generated: true },
    image_url: { type: String, nullable: true },
    image_path: { type: String, nullable: true },
    alt_text: { type: String, nullable: true },
    is_primary: { type: Boolean, default: false, nullable: false },
    sort_order: { type: Number, default: 0, nullable: false },
    created_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    updated_at: { type: Date, default: () => "CURRENT_TIMESTAMP", nullable: false },
    is_deleted: { type: Boolean, default: false, nullable: false },
  },
  relations: {
    product: {
      target: "Product",
      type: "many-to-one",
      onDelete: "CASCADE",
      inverseSide: "images",
    },
  },
});

module.exports = ProductImage;
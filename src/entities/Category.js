const { EntitySchema } = require("typeorm");

const Category = new EntitySchema({
  name: "Category",
  tableName: "categories",
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String, nullable: false },
    slug: { type: String, nullable: false, unique: true },
    description: { type: String, nullable: true },
    image_path: { type: String, nullable: true },
    color: { type: String, nullable: true },
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
    is_active: { type: Boolean, default: true, nullable: false },
  },
  relations: {
    parent: {
      target: "Category",
      type: "many-to-one",
      onDelete: "CASCADE",
      joinColumn: { name: "parent_id" },
      inverseSide: "children", // optional
    },
    children: {
      target: "Category",
      type: "one-to-many",
      mappedBy: "parent",
    },
  },
});

module.exports = Category;

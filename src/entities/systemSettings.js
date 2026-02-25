// src/entities/SystemSetting.js
const { EntitySchema } = require("typeorm");

const SettingType = {
  EMAIL: "email",
  DEVICE: "device",
  INVENTORY_SYNC: "inventory_sync",
  GENERAL: "general",
  INVENTORY: "inventory",
  SALES: "sales",
  NOTIFICATIONS: "notifications",
  DATA_REPORTS: "data_reports",
  INTEGRATIONS: "integrations",
  AUDIT_SECURITY: "audit_security",
  SEO: "seo",
  TAX: "tax",
  SUPPLIER_TAX: "supplier_tax",
  SHIPPING: "shipping",
  CASHIER: "cashier",
};

const SystemSetting = new EntitySchema({
  name: "SystemSetting",
  tableName: "system_settings",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true, // AUTOINCREMENT
    },

    key: {
      type: "varchar",
      length: 100,
      nullable: false,
    },

    value: {
      type: "text",
      nullable: false,
    },

    setting_type: {
      type: "varchar",
      name: "setting_type", // 👈 snake_case sa DB
      enum: Object.values(SettingType),
      nullable: false,
      check:
        "setting_type IN ('general','email','seo','tax','supplier_tax','shipping','inventory', 'device', 'inventory_sync', 'sales', 'data_reports', 'integrations', 'audit_security', 'cashier')",
    },

    description: {
      type: "text",
      nullable: true,
    },

    is_public: {
      type: "boolean",
      name: "is_public",
      default: false,
    },

    is_deleted: {
      type: "boolean",
      name: "is_deleted",
      default: false,
    },

    created_at: {
      type: "datetime",
      name: "created_at",
      createDate: true,
      default: () => "CURRENT_TIMESTAMP",
    },

    updated_at: {
      type: "datetime",
      name: "updated_at",
      updateDate: true,
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: "CURRENT_TIMESTAMP",
    },
  },

  indices: [
    {
      name: "idx_system_settings_type_key",
      columns: ["setting_type", "key"],
      unique: true, // UNIQUE(setting_type, key)
    },
  ],
});

module.exports = { SystemSetting, SettingType };

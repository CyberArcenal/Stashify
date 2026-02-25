// src/main/db/datasource.js
//@ts-check
const fs = require("fs");
const path = require("path");
const { DataSource } = require("typeorm");
const { getDatabaseConfig } = require("./database");

// Import Entity constants

const { AuditLog } = require("../../entities/AuditLog");
const LicenseCache = require("../../entities/LicenseCache");
const { SystemSetting } = require("../../entities/systemSettings");
const NotificationLog = require("../../entities/NotificationLog");
const Notification = require("../../entities/Notification");
const Category = require("../../entities/Category");
const Customer = require("../../entities/Customer");
const Order = require("../../entities/Order");
const OrderItem = require("../../entities/OrderItem");
const Product = require("../../entities/Product");
const ProductImage = require("../../entities/ProductImage");
const ProductVariant = require("../../entities/ProductVariant");
const Purchase = require("../../entities/Purchase");
const PurchaseItem = require("../../entities/PurchaseItem");
const StockItem = require("../../entities/StockItem");
const StockMovement = require("../../entities/StockMovement");
const Supplier = require("../../entities/Supplier");
const Warehouse = require("../../entities/Warehouse");
const LoyaltyTransaction = require("../../entities/LoyaltyTransaction");

const config = getDatabaseConfig();

const entities = [
  AuditLog,
  Category,
  Customer,
  LicenseCache,
  LoyaltyTransaction,
  Notification,
  NotificationLog,
  Order,
  OrderItem,
  Product,
  ProductImage,
  ProductVariant,
  Purchase,
  PurchaseItem,
  StockItem,
  StockMovement,
  Supplier,
  SystemSetting,
  Warehouse,
];

const dataSourceOptions = {
  ...config,
  entities,
  migrations: Array.isArray(config.migrations)
    ? config.migrations
    : [config.migrations],
};

// @ts-ignore
const AppDataSource = new DataSource(dataSourceOptions);

module.exports = { AppDataSource };

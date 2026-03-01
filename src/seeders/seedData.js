// seedData.js
// Stashify System Seeder
// Run with: node seedData.js [options]

const { DataSource } = require("typeorm");
const { AppDataSource } = require("../main/db/datasource"); // adjust path as needed

// Import all entities (using require because they are EntitySchema)
const AuditLog = require("../entities/AuditLog"); // note: AuditLog is exported as { AuditLog }? Actually AuditLog.js exports { AuditLog }, so we need destructuring
const Category = require("../entities/Category");
const Customer = require("../entities/Customer");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const Notification = require("../entities/Notification");
const NotificationLog = require("../entities/NotificationLog");
const Order = require("../entities/Order");
const OrderItem = require("../entities/OrderItem");
const Product = require("../entities/Product");
const ProductImage = require("../entities/ProductImage");
const ProductVariant = require("../entities/ProductVariant");
const Purchase = require("../entities/Purchase");
const PurchaseItem = require("../entities/PurchaseItem");
const StockItem = require("../entities/StockItem");
const StockMovement = require("../entities/StockMovement");
const Supplier = require("../entities/Supplier");
const Warehouse = require("../entities/Warehouse");

// Handle AuditLog which is exported as an object
const { AuditLog: AuditLogEntity } = require("../entities/AuditLog");

// ========== CONFIGURATION ==========
const DEFAULT_CONFIG = {
  warehouseCount: 3,
  categoryCount: 8,
  supplierCount: 10,
  customerCount: 30,
  productCount: 50,
  variantPerProduct: 2, // average variants per product (some may have 0)
  imagePerProduct: 2, // average images per product
  purchaseCount: 20,
  orderCount: 100,
  stockMovementCount: 200,
  loyaltyTransactionCount: 80,
  notificationCount: 40,
  notificationLogCount: 50,
  auditLogCount: 60,
  clearOnly: false,
  skipWarehouses: false,
  skipCategories: false,
  skipSuppliers: false,
  skipCustomers: false,
  skipProducts: false,
  skipVariants: false,
  skipImages: false,
  skipStockItems: false,
  skipPurchases: false,
  skipOrders: false,
  skipStockMovements: false,
  skipLoyaltyTransactions: false,
  skipNotifications: false,
  skipNotificationLogs: false,
  skipAuditLogs: false,
};

// ========== RANDOM HELPERS ==========
const random = {
  int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  float: (min, max, decimals = 2) =>
    +(Math.random() * (max - min) + min).toFixed(decimals),
  date: (start, end) =>
    new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    ),
  pastDate: () => random.date(new Date(2024, 0, 1), new Date()),
  futureDate: () => random.date(new Date(), new Date(2026, 11, 31)),
  element: (arr) => arr[Math.floor(Math.random() * arr.length)],
  boolean: (probability = 0.5) => Math.random() < probability,
  sku: (usedSet) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let sku;
    do {
      sku = Array.from(
        { length: 8 },
        () => chars[random.int(0, chars.length - 1)],
      ).join("");
    } while (usedSet.has(sku));
    usedSet.add(sku);
    return sku;
  },
  barcode: (usedSet) => {
    let barcode;
    do {
      barcode = Array.from({ length: 13 }, () => random.int(0, 9)).join("");
    } while (usedSet.has(barcode));
    usedSet.add(barcode);
    return barcode;
  },
  phone: () => `+63${random.int(900000000, 999999999)}`,
  email: (prefix) => `${prefix}${random.int(1, 999)}@example.com`,
  name: () => {
    const first = [
      "John",
      "Jane",
      "Michael",
      "Sarah",
      "David",
      "Maria",
      "James",
      "Patricia",
      "Robert",
      "Jennifer",
    ];
    const last = [
      "Smith",
      "Doe",
      "Johnson",
      "Brown",
      "Davis",
      "Garcia",
      "Rodriguez",
      "Wilson",
      "Martinez",
      "Taylor",
    ];
    return `${random.element(first)} ${random.element(last)}`;
  },
  company: () => {
    const prefixes = [
      "Global",
      "International",
      "Premier",
      "Elite",
      "Advanced",
      "Prime",
      "Metro",
      "United",
    ];
    const suffixes = [
      "Supplies",
      "Trading",
      "Distributors",
      "Corporation",
      "Inc",
      "LLC",
      "Group",
      "Solutions",
    ];
    return `${random.element(prefixes)} ${random.element(suffixes)}`;
  },
  productName: () => {
    const adjectives = [
      "Premium",
      "Deluxe",
      "Basic",
      "Pro",
      "Lite",
      "Eco",
      "Smart",
      "Classic",
      "Industrial",
      "Compact",
    ];
    const nouns = [
      "Widget",
      "Gadget",
      "Tool",
      "Device",
      "Appliance",
      "Component",
      "Accessory",
      "Supply",
      "Instrument",
      "Machine",
    ];
    return `${random.element(adjectives)} ${random.element(nouns)}`;
  },
  description: () =>
    random.boolean(0.3)
      ? `High quality ${random.productName().toLowerCase()} for professional use.`
      : null,
  orderNumber: (usedSet) => {
    let num;
    do {
      num = `ORD-${random.int(100000, 999999)}`;
    } while (usedSet.has(num));
    usedSet.add(num);
    return num;
  },
  purchaseNumber: (usedSet) => {
    let num;
    do {
      num = `PO-${random.int(100000, 999999)}`;
    } while (usedSet.has(num));
    usedSet.add(num);
    return num;
  },
  movementReference: (prefix) =>
    `${prefix}-${random.int(1000, 9999)}-${Date.now().toString().slice(-4)}`,
  word: () => {
    const words = [
      "Lorem",
      "ipsum",
      "dolor",
      "sit",
      "amet",
      "consectetur",
      "adipiscing",
      "elit",
      "sed",
      "do",
      "eiusmod",
      "tempor",
      "incididunt",
    ];
    return random.element(words);
  },
};

// ========== SEEDER CLASS ==========
class InventorySeeder {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataSource = null;
    this.queryRunner = null;
    this.usedSkus = new Set();
    this.usedBarcodes = new Set();
    this.usedOrderNumbers = new Set();
    this.usedPurchaseNumbers = new Set();
    this.usedCompanyNames = new Set(); // to ensure supplier.name uniqueness
    // Caches for quick access
    this.productPriceCache = new Map(); // product id -> net_price
    this.variantPriceCache = new Map(); // variant id -> net_price
  }

  async init() {
    console.log("⏳ Initializing database connection...");
    this.dataSource = await AppDataSource.initialize();
    this.queryRunner = this.dataSource.createQueryRunner();
    console.log("✅ Database connected");
  }

  async destroy() {
    if (this.queryRunner) await this.queryRunner.release();
    if (this.dataSource) await this.dataSource.destroy();
    console.log("🔒 Connection closed");
  }

  async clearData() {
    console.log("🧹 Clearing old data...");
    await this.queryRunner.query("PRAGMA foreign_keys = OFF;"); // for SQLite, adjust for other DBs if needed
    try {
      // Order matters: delete child tables first
      await this.queryRunner.clearTable("audit_logs");
      await this.queryRunner.clearTable("notification_logs");
      await this.queryRunner.clearTable("notifications");
      await this.queryRunner.clearTable("loyalty_transactions");
      await this.queryRunner.clearTable("stock_movements");
      await this.queryRunner.clearTable("order_items");
      await this.queryRunner.clearTable("orders");
      await this.queryRunner.clearTable("purchase_items");
      await this.queryRunner.clearTable("purchases");
      await this.queryRunner.clearTable("stock_items");
      await this.queryRunner.clearTable("product_images");
      await this.queryRunner.clearTable("product_variants");
      await this.queryRunner.clearTable("products");
      await this.queryRunner.clearTable("customers");
      await this.queryRunner.clearTable("suppliers");
      await this.queryRunner.clearTable("categories");
      await this.queryRunner.clearTable("warehouses");
    } finally {
      await this.queryRunner.query("PRAGMA foreign_keys = ON;");
    }
    console.log("✅ All tables cleared");
  }

  // ========== SEED METHODS ==========

  async seedWarehouses() {
    console.log(`🏭 Seeding ${this.config.warehouseCount} warehouses...`);
    const warehouses = [];
    const types = ["warehouse", "store", "online"];
    for (let i = 0; i < this.config.warehouseCount; i++) {
      const createdAt = random.pastDate();
      warehouses.push({
        type: random.element(types),
        name: `Warehouse ${i + 1} - ${random.company()}`,
        location: random.boolean(0.7)
          ? `City ${random.int(1, 10)}, Street ${random.int(100, 999)}`
          : null,
        limit_capacity: random.int(1000, 10000),
        is_active: random.boolean(0.9),
        created_at: createdAt,
        updated_at: createdAt,
        is_deleted: false,
      });
    }
    const repo = this.dataSource.getRepository(Warehouse);
    const saved = await repo.save(warehouses);
    console.log(`✅ ${saved.length} warehouses saved`);
    return saved;
  }

  async seedCategories() {
    console.log(
      `📂 Seeding ${this.config.categoryCount} categories with hierarchy...`,
    );
    const repo = this.dataSource.getRepository(Category);
    const categories = [];

    // Create top-level categories first
    const topNames = [
      "Electronics",
      "Clothing",
      "Home & Garden",
      "Sports",
      "Books",
      "Toys",
      "Beauty",
      "Automotive",
    ];
    const topCount = Math.min(this.config.categoryCount, topNames.length);
    for (let i = 0; i < topCount; i++) {
      const createdAt = random.pastDate();
      categories.push({
        name: topNames[i],
        slug: topNames[i].toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"),
        description: `${topNames[i]} products`,
        image_path: random.boolean(0.3) ? `/images/categories/${i}.jpg` : null,
        color: random.boolean(0.5)
          ? `#${Math.floor(Math.random() * 16777215).toString(16)}`
          : null,
        created_at: createdAt,
        updated_at: createdAt,
        is_active: true,
        parent: null,
      });
    }

    // Save top-level to get IDs
    const savedTops = await repo.save(categories.slice(0, topCount));
    categories.length = 0; // clear

    // Now create subcategories for some top categories
    let remaining = this.config.categoryCount - topCount;
    while (remaining > 0) {
      for (const parent of savedTops) {
        if (remaining <= 0) break;
        const createdAt = random.pastDate();
        const subName = `${parent.name} Accessories`;
        categories.push({
          name: subName,
          slug: `${parent.slug}-accessories`,
          description: `Accessories for ${parent.name}`,
          image_path: null,
          color: null,
          created_at: createdAt,
          updated_at: createdAt,
          is_active: true,
          parent: { id: parent.id },
        });
        remaining--;
        if (remaining <= 0) break;
      }
    }

    if (categories.length > 0) {
      await repo.save(categories);
    }

    // Return all categories (top + subs)
    const all = await repo.find();
    console.log(`✅ ${all.length} categories saved`);
    return all;
  }

  async seedSuppliers() {
    console.log(`🏭 Seeding ${this.config.supplierCount} suppliers...`);
    const suppliers = [];
    const statuses = ["pending", "approved", "rejected"];
    for (let i = 0; i < this.config.supplierCount; i++) {
      const createdAt = random.pastDate();
      // Ensure unique company name
      let name;
      do {
        name = random.company();
      } while (this.usedCompanyNames.has(name));
      this.usedCompanyNames.add(name);

      suppliers.push({
        name: name,
        contact_person: random.boolean(0.8) ? random.name() : null,
        email: random.email("supplier"),
        phone: random.boolean(0.8) ? random.phone() : null,
        address: random.boolean(0.6)
          ? `${random.int(1, 999)} Industrial Ave, City ${random.int(1, 10)}`
          : null,
        tax_id: random.boolean(0.7) ? `TAX-${random.int(10000, 99999)}` : null,
        notes: random.boolean(0.3) ? "Preferred supplier" : null,
        status: random.element(statuses),
        is_active: random.boolean(0.9),
        is_deleted: false,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
    const repo = this.dataSource.getRepository(Supplier);
    const saved = await repo.save(suppliers);
    console.log(`✅ ${saved.length} suppliers saved`);
    return saved;
  }

  async seedCustomers() {
    console.log(`👥 Seeding ${this.config.customerCount} customers...`);
    const customers = [];
    const statuses = ["regular", "vip", "elite"];
    for (let i = 0; i < this.config.customerCount; i++) {
      const pointsBalance = random.int(0, 500);
      const createdAt = random.pastDate();
      customers.push({
        name: random.name(),
        contactInfo: random.boolean(0.7) ? random.phone() : null,
        email: random.email("customer"),
        phone: random.boolean(0.7) ? random.phone() : null,
        loyaltyPointsBalance: pointsBalance,
        lifetimePointsEarned: pointsBalance + random.int(0, 200),
        status: random.element(statuses),
        createdAt: createdAt,
        updatedAt: createdAt,
      });
    }
    const repo = this.dataSource.getRepository(Customer);
    const saved = await repo.save(customers);
    console.log(`✅ ${saved.length} customers saved`);
    return saved;
  }

  async seedProducts(categories) {
    console.log(`📦 Seeding ${this.config.productCount} products...`);
    const products = [];
    for (let i = 0; i < this.config.productCount; i++) {
      const price = random.float(10, 500);
      const cost = price * random.float(0.5, 0.8);
      const sku = random.sku(this.usedSkus);
      const barcode = random.barcode(this.usedBarcodes);
      const createdAt = random.pastDate();
      products.push({
        name: random.productName(),
        slug: `${sku}-${random.word()}`.toLowerCase(),
        description: random.description(),
        net_price: price,
        cost_per_item: cost,
        track_quantity: true,
        allow_backorder: random.boolean(0.1),
        compare_price: random.boolean(0.3)
          ? price * random.float(1.1, 1.3)
          : null,
        sku: sku,
        barcode: barcode,
        weight: random.boolean(0.4) ? random.float(0.1, 10) : null,
        dimensions: random.boolean(0.3)
          ? `${random.int(10, 50)}x${random.int(10, 50)}x${random.int(10, 50)}`
          : null,
        is_published: random.boolean(0.8),
        published_at: random.boolean(0.7) ? random.pastDate() : null,
        created_at: createdAt,
        updated_at: createdAt,
        is_deleted: false,
        is_active: random.boolean(0.9),
        category: random.element(categories),
      });
    }
    const repo = this.dataSource.getRepository(Product);
    const saved = await repo.save(products);
    saved.forEach((p) =>
      this.productPriceCache.set(p.id, parseFloat(p.net_price)),
    );
    console.log(`✅ ${saved.length} products saved`);
    return saved;
  }

  async seedProductVariants(products) {
    console.log(`🔀 Seeding variants for products...`);
    const variantRepo = this.dataSource.getRepository(ProductVariant);
    const variants = [];
    for (const product of products) {
      // Randomly decide to create variants for this product (approx 60% of products)
      if (random.boolean(0.6)) {
        const numVariants = random.int(1, this.config.variantPerProduct);
        for (let j = 0; j < numVariants; j++) {
          const price =
            this.productPriceCache.get(product.id) * random.float(0.9, 1.2);
          const cost = price * random.float(0.5, 0.8);
          const sku = random.sku(this.usedSkus);
          const barcode = random.barcode(this.usedBarcodes);
          variants.push({
            name: `Variant ${j + 1} - ${random.word()}`,
            sku: sku,
            net_price: price,
            cost_per_item: cost,
            barcode: barcode,
            created_at: product.created_at,
            updated_at: product.created_at,
            is_deleted: false,
            is_active: true,
            product: { id: product.id },
          });
        }
      }
    }
    if (variants.length === 0) {
      console.log(`⚠️ No variants created`);
      return [];
    }
    const saved = await variantRepo.save(variants);
    saved.forEach((v) =>
      this.variantPriceCache.set(v.id, parseFloat(v.net_price)),
    );
    console.log(`✅ ${saved.length} variants saved`);
    return saved;
  }

  async seedProductImages(products, variants) {
    console.log(`🖼️ Seeding product images...`);
    const imageRepo = this.dataSource.getRepository(ProductImage);
    const images = [];

    // Images for products
    for (const product of products) {
      const numImages = random.int(0, this.config.imagePerProduct);
      for (let j = 0; j < numImages; j++) {
        const createdAt = product.created_at;
        images.push({
          image_url: random.boolean(0.7)
            ? `https://example.com/images/product_${product.id}_${j}.jpg`
            : null,
          image_path: random.boolean(0.5)
            ? `/storage/products/${product.id}/${j}.jpg`
            : null,
          alt_text: `Image ${j + 1} of ${product.name}`,
          is_primary: j === 0,
          sort_order: j,
          created_at: createdAt,
          updated_at: createdAt,
          is_deleted: false,
          product: { id: product.id },
        });
      }
    }

    // Images for variants (optional)
    for (const variant of variants) {
      if (random.boolean(0.3)) {
        const createdAt = variant.created_at;
        images.push({
          image_url: random.boolean(0.7)
            ? `https://example.com/images/variant_${variant.id}.jpg`
            : null,
          image_path: random.boolean(0.5)
            ? `/storage/variants/${variant.id}.jpg`
            : null,
          alt_text: `Variant ${variant.name}`,
          is_primary: true,
          sort_order: 0,
          created_at: createdAt,
          updated_at: createdAt,
          is_deleted: false,
          product: { id: variant.product.id },
        });
      }
    }

    if (images.length === 0) {
      console.log(`⚠️ No images created`);
      return [];
    }

    const saved = await imageRepo.save(images);
    console.log(`✅ ${saved.length} images saved`);
    return saved;
  }

  async seedStockItems(products, variants, warehouses) {
    console.log(
      `📊 Seeding stock items for product/variant/warehouse combinations...`,
    );
    const stockRepo = this.dataSource.getRepository(StockItem);
    const stockItems = [];

    for (const warehouse of warehouses) {
      for (const product of products) {
        const productVariants = variants.filter(
          (v) => v.product.id === product.id,
        );
        if (productVariants.length > 0) {
          for (const variant of productVariants) {
            const createdAt = random.pastDate();
            const quantity = random.int(0, 200);
            stockItems.push({
              quantity: quantity,
              reorder_level: random.int(5, 50),
              low_stock_threshold: random.int(10, 30),
              created_at: createdAt,
              updated_at: createdAt,
              is_deleted: false,
              // Set explicit columns
              productId: product.id,
              variantId: variant.id,
              warehouseId: warehouse.id,
              // Set relations to populate the automatically generated foreign key columns (productId, variantId, warehouseId)
              product: { id: product.id },
              variant: { id: variant.id },
              warehouse: { id: warehouse.id },
            });
          }
        } else {
          const createdAt = random.pastDate();
          const quantity = random.int(0, 200);
          stockItems.push({
            quantity: quantity,
            reorder_level: random.int(5, 50),
            low_stock_threshold: random.int(10, 30),
            created_at: createdAt,
            updated_at: createdAt,
            is_deleted: false,
            productId: product.id,
            variantId: null,
            warehouseId: warehouse.id,
            product: { id: product.id },
            variant: null,
            warehouse: { id: warehouse.id },
          });
        }
      }
    }

    // Limit to reasonable number for performance
    const maxStockItems = 500;
    if (stockItems.length > maxStockItems) {
      stockItems.length = maxStockItems;
    }

    const saved = await stockRepo.save(stockItems);
    console.log(`✅ ${saved.length} stock items saved`);
    return saved;
  }

  async seedPurchases(suppliers, warehouses) {
    console.log(
      `📥 Seeding ${this.config.purchaseCount} purchases with items...`,
    );
    const purchaseRepo = this.dataSource.getRepository(Purchase);
    const purchaseItemRepo = this.dataSource.getRepository(PurchaseItem);
    const purchases = [];
    const purchaseItems = [];

    const allProducts = await this.dataSource.getRepository(Product).find();
    const allVariants = await this.dataSource
      .getRepository(ProductVariant)
      .find({ relations: ["product"] });

    for (let i = 0; i < this.config.purchaseCount; i++) {
      const supplier = random.element(suppliers);
      const warehouse = random.element(warehouses);
      const status = random.element([
        "initiated",
        "pending",
        "confirmed",
        "received",
        "cancelled",
      ]);
      const createdAt = random.pastDate();
      const purchaseNumber = random.purchaseNumber(this.usedPurchaseNumbers);
      let subtotal = 0;

      const purchase = {
        purchase_number: purchaseNumber,
        status: status,
        subtotal: 0,
        tax_amount: 0,
        total: 0,
        notes: random.boolean(0.2) ? "Urgent order" : null,
        inventory_processed: status === "received" ? true : false,
        is_received: status === "received" ? true : false,
        received_at: status === "received" ? random.pastDate() : null,
        proceed_by: random.boolean(0.5) ? random.int(1, 5) : null,
        created_at: createdAt,
        updated_at: createdAt,
        is_deleted: false,
        supplier: { id: supplier.id },
        warehouse: { id: warehouse.id },
      };

      const savedPurchase = await purchaseRepo.save(purchase);
      purchases.push(savedPurchase);

      const itemCount = random.int(1, 6);
      for (let j = 0; j < itemCount; j++) {
        let product,
          variant = null;
        if (random.boolean(0.7) && allVariants.length > 0) {
          variant = random.element(allVariants);
          product = variant.product;
        } else {
          product = random.element(allProducts);
        }
        const quantity = random.int(5, 100);
        const unitCost = product.net_price
          ? product.net_price * random.float(0.5, 0.9)
          : random.float(5, 50);
        const itemTotal = quantity * unitCost;
        subtotal += itemTotal;

        purchaseItems.push({
          quantity: quantity,
          unit_cost: unitCost,
          total: itemTotal,
          created_at: createdAt,
          updated_at: createdAt,
          is_deleted: false,
          purchase: { id: savedPurchase.id },
          product: { id: product.id },
          variant: variant ? { id: variant.id } : null,
        });
      }

      // Update purchase totals
      const taxAmount = subtotal * 0.12;
      const total = subtotal + taxAmount;
      savedPurchase.subtotal = subtotal;
      savedPurchase.tax_amount = taxAmount;
      savedPurchase.total = total;
      await purchaseRepo.save(savedPurchase);
    }

    const savedItems = await purchaseItemRepo.save(purchaseItems);
    console.log(
      `✅ ${purchases.length} purchases with ${savedItems.length} items saved`,
    );
    return { purchases, purchaseItems: savedItems };
  }

  async seedOrders(customers) {
    console.log(`🧾 Seeding ${this.config.orderCount} orders with items...`);
    const orderRepo = this.dataSource.getRepository(Order);
    const orderItemRepo = this.dataSource.getRepository(OrderItem);
    const orders = [];
    const orderItems = [];

    const allProducts = await this.dataSource.getRepository(Product).find();
    const allVariants = await this.dataSource
      .getRepository(ProductVariant)
      .find({ relations: ["product"] });
    const warehouses = await this.dataSource.getRepository(Warehouse).find();

    const statuses = [
      "initiated",
      "pending",
      "confirmed",
      "completed",
      "cancelled",
      "refunded",
    ];

    for (let i = 0; i < this.config.orderCount; i++) {
      const customer = random.boolean(0.7) ? random.element(customers) : null;
      const status = random.element(statuses);
      const createdAt = random.pastDate();
      const orderNumber = random.orderNumber(this.usedOrderNumbers);
      let subtotal = 0;

      const order = {
        order_number: orderNumber,
        status: status,
        subtotal: 0,
        tax_amount: 0,
        total: 0,
        notes: random.boolean(0.2) ? "Customer requested gift wrap" : null,
        inventory_processed: status === "completed" ? true : false,
        created_at: createdAt,
        updated_at: createdAt,
        is_deleted: false,
        customer: customer ? { id: customer.id } : null,
      };

      const savedOrder = await orderRepo.save(order);
      orders.push(savedOrder);

      const itemCount = random.int(1, 5);
      for (let j = 0; j < itemCount; j++) {
        let product,
          variant = null;
        if (random.boolean(0.7) && allVariants.length > 0) {
          variant = random.element(allVariants);
          product = variant.product;
        } else {
          product = random.element(allProducts);
        }
        const warehouse = random.element(warehouses);
        const quantity = random.int(1, 10);
        const unitPrice = variant
          ? variant.net_price || product.net_price
          : product.net_price;
        const price = unitPrice || random.float(10, 200);
        const discount = random.boolean(0.3) ? random.float(0, price * 0.2) : 0;
        const taxRate = 0.12;
        const lineNet = price * quantity - discount;
        const lineTax = lineNet * taxRate;
        const lineGross = lineNet + lineTax;
        subtotal += lineNet;

        orderItems.push({
          quantity: quantity,
          unit_price: price,
          discount_amount: discount,
          tax_rate: taxRate,
          line_net_total: lineNet,
          line_tax_total: lineTax,
          line_gross_total: lineGross,
          created_at: createdAt,
          updated_at: createdAt,
          is_deleted: false,
          order: { id: savedOrder.id },
          product: { id: product.id },
          variant: variant ? { id: variant.id } : null,
          warehouse: { id: warehouse.id },
        });
      }

      const taxAmount = subtotal * 0.12;
      const total = subtotal + taxAmount;
      savedOrder.subtotal = subtotal;
      savedOrder.tax_amount = taxAmount;
      savedOrder.total = total;
      await orderRepo.save(savedOrder);
    }

    const savedItems = await orderItemRepo.save(orderItems);
    console.log(
      `✅ ${orders.length} orders with ${savedItems.length} items saved`,
    );
    return { orders, orderItems: savedItems };
  }

  async seedStockMovements(warehouses, purchases, orders) {
    console.log(
      `📦 Seeding ${this.config.stockMovementCount} stock movements...`,
    );
    const movementRepo = this.dataSource.getRepository(StockMovement);
    const movements = [];

    // Generate movements from purchase receipts (incoming)
    for (const purchase of purchases) {
      if (purchase.status === "received") {
        const purchaseItems = await this.dataSource
          .getRepository(PurchaseItem)
          .find({
            where: { purchase: { id: purchase.id } },
            relations: ["product", "variant"],
          });
        for (const item of purchaseItems) {
          movements.push({
            change: item.quantity,
            movement_type: "in",
            reference_code: `PO-${purchase.purchase_number}`,
            reason: "Purchase receipt",
            metadata: JSON.stringify({ purchaseId: purchase.id }),
            current_quantity: null,
            created_at: purchase.received_at || purchase.created_at,
            updated_at: purchase.received_at || purchase.created_at,
            is_deleted: false,
            stockItem: null, // will be linked later
          });
        }
      }
    }

    // Generate movements from order fulfillments (outgoing)
    for (const order of orders) {
      if (order.status === "completed") {
        const orderItems = await this.dataSource.getRepository(OrderItem).find({
          where: { order: { id: order.id } },
          relations: ["product", "variant", "warehouse"],
        });
        for (const item of orderItems) {
          movements.push({
            change: -item.quantity,
            movement_type: "out",
            reference_code: `ORD-${order.order_number}`,
            reason: "Order shipment",
            metadata: JSON.stringify({ order_id: order.id }),
            current_quantity: null,
            created_at: order.created_at,
            updated_at: order.created_at,
            is_deleted: false,
            stockItem: null,
          });
        }
      }
    }

    // Add some adjustment movements
    const adjustmentCount = this.config.stockMovementCount - movements.length;
    for (let i = 0; i < adjustmentCount; i++) {
      const change = random.int(-50, 50);
      if (change === 0) continue;
      const createdAt = random.pastDate();
      movements.push({
        change: change,
        movement_type: "adjustment",
        reference_code: random.movementReference("ADJ"),
        reason: change > 0 ? "Stock count surplus" : "Stock count deficit",
        metadata: JSON.stringify({ reason: "manual adjustment" }),
        current_quantity: null,
        created_at: createdAt,
        updated_at: createdAt,
        is_deleted: false,
        stockItem: null,
      });
    }

    // Link each movement to a random stockItem
    const stockItems = await this.dataSource.getRepository(StockItem).find();
    if (stockItems.length === 0) {
      console.log("⚠️ No stock items found, skipping stock movements");
      return [];
    }

    for (const movement of movements) {
      movement.stockItem = { id: random.element(stockItems).id };
    }

    // Limit to requested count
    if (movements.length > this.config.stockMovementCount) {
      movements.length = this.config.stockMovementCount;
    }

    const saved = await movementRepo.save(movements);
    console.log(`✅ ${saved.length} stock movements saved`);
    return saved;
  }

  async seedLoyaltyTransactions(customers, orders) {
    console.log(
      `💳 Seeding ${this.config.loyaltyTransactionCount} loyalty transactions...`,
    );
    const transactionRepo = this.dataSource.getRepository(LoyaltyTransaction);
    const transactions = [];

    for (let i = 0; i < this.config.loyaltyTransactionCount; i++) {
      const customer = random.element(customers);
      const order = random.boolean(0.6) ? random.element(orders) : null;
      const pointsChange = random.boolean(0.7)
        ? random.int(10, 200)
        : -random.int(5, 50);
      const timestamp = order ? order.created_at : random.pastDate();
      const transactionType =
        pointsChange > 0 ? "earn" : pointsChange < 0 ? "redeem" : "earn";

      transactions.push({
        transactionType: transactionType,
        pointsChange: pointsChange,
        timestamp: timestamp,
        notes:
          pointsChange > 0 ? "Earned from purchase" : "Redeemed for discount",
        updatedAt: timestamp,
        customer: { id: customer.id },
        order: order ? { id: order.id } : null,
      });
    }

    const saved = await transactionRepo.save(transactions);
    console.log(`✅ ${saved.length} loyalty transactions saved`);
    return saved;
  }

  async seedNotifications() {
    console.log(`🔔 Seeding ${this.config.notificationCount} notifications...`);
    const repo = this.dataSource.getRepository(Notification);
    const types = ["info", "success", "warning", "error", "purchase", "sale"];
    const notifications = [];

    for (let i = 0; i < this.config.notificationCount; i++) {
      const createdAt = random.pastDate();
      notifications.push({
        userId: random.int(1, 5), // assume users 1-5 exist
        title: `Notification ${i + 1}`,
        message: `This is a ${random.element(types)} notification.`,
        type: random.element(types),
        isRead: random.boolean(0.3),
        metadata: random.boolean(0.4)
          ? JSON.stringify({ refId: random.int(100, 999) })
          : null,
        createdAt: createdAt,
        updatedAt: createdAt,
      });
    }

    const saved = await repo.save(notifications);
    console.log(`✅ ${saved.length} notifications saved`);
    return saved;
  }

  async seedNotificationLogs() {
    console.log(
      `📧 Seeding ${this.config.notificationLogCount} notification logs...`,
    );
    const repo = this.dataSource.getRepository(NotificationLog);
    const logs = [];
    const statuses = ["queued", "sent", "failed", "resend"];

    for (let i = 0; i < this.config.notificationLogCount; i++) {
      const status = random.element(statuses);
      const sentAt = status === "sent" ? random.pastDate() : null;
      const lastErrorAt = status === "failed" ? random.pastDate() : null;
      const createdAt = random.pastDate();
      logs.push({
        recipient_email: random.email("user"),
        subject: random.boolean(0.7) ? "Order Confirmation" : null,
        payload: random.boolean(0.5)
          ? JSON.stringify({ orderId: random.int(1000, 9999) })
          : null,
        status: status,
        error_message: status === "failed" ? "SMTP error" : null,
        retry_count: status === "failed" ? random.int(1, 3) : 0,
        resend_count: status === "resend" ? random.int(1, 2) : 0,
        sent_at: sentAt,
        last_error_at: lastErrorAt,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    await repo.save(logs);
    console.log(
      `✅ ${this.config.notificationLogCount} notification logs saved`,
    );
  }

  async seedAuditLogs() {
    console.log(`📝 Seeding ${this.config.auditLogCount} audit logs...`);
    const actions = ["CREATE", "UPDATE", "DELETE", "VIEW", "LOGIN", "LOGOUT"];
    const entities = [
      "Product",
      "Customer",
      "Order",
      "Purchase",
      "StockItem",
      "Supplier",
      "Category",
      "Warehouse",
      "Variant",
      "LoyaltyTransaction",
    ];

    const logs = [];
    for (let i = 0; i < this.config.auditLogCount; i++) {
      logs.push({
        action: random.element(actions),
        entity: random.element(entities),
        entityId: random.int(1, 100),
        timestamp: random.pastDate(),
        description: random.boolean(0.3) ? "Audit log entry" : null,
        newData: random.boolean(0.2)
          ? JSON.stringify({ field: "value" })
          : null,
        previousData: random.boolean(0.2)
          ? JSON.stringify({ field: "old" })
          : null,
      });
    }

    const repo = this.dataSource.getRepository(AuditLogEntity);
    await repo.save(logs);
    console.log(`✅ ${this.config.auditLogCount} audit logs saved`);
  }

  // ========== MAIN RUN METHOD ==========
  async run() {
    try {
      await this.init();
      await this.queryRunner.startTransaction();

      if (!this.config.clearOnly) {
        await this.clearData();
      }

      if (this.config.clearOnly) {
        console.log("🧹 Clear only mode – no seeding performed.");
        await this.queryRunner.commitTransaction();
        return;
      }

      let warehouses = [];
      let categories = [];
      let suppliers = [];
      let customers = [];
      let products = [];
      let variants = [];
      let images = [];
      let stockItems = [];
      let purchases = [],
        purchaseItems = [];
      let orders = [],
        orderItems = [];
      let movements = [];
      let loyaltyTransactions = [];
      let notifications = [];

      // Seeding in dependency order
      if (!this.config.skipWarehouses) warehouses = await this.seedWarehouses();
      if (!this.config.skipCategories) categories = await this.seedCategories();
      if (!this.config.skipSuppliers) suppliers = await this.seedSuppliers();
      if (!this.config.skipCustomers) customers = await this.seedCustomers();

      if (!this.config.skipProducts && categories.length) {
        products = await this.seedProducts(categories);
      }

      if (!this.config.skipVariants && products.length) {
        variants = await this.seedProductVariants(products);
      }

      if (!this.config.skipImages && products.length) {
        images = await this.seedProductImages(products, variants);
      }

      if (!this.config.skipStockItems && products.length && warehouses.length) {
        stockItems = await this.seedStockItems(products, variants, warehouses);
      }

      if (!this.config.skipPurchases && suppliers.length && warehouses.length) {
        const result = await this.seedPurchases(suppliers, warehouses);
        purchases = result.purchases;
        purchaseItems = result.purchaseItems;
      }

      if (!this.config.skipOrders && customers.length) {
        const result = await this.seedOrders(customers);
        orders = result.orders;
        orderItems = result.orderItems;
      }

      if (
        !this.config.skipStockMovements &&
        warehouses.length &&
        purchases.length &&
        orders.length &&
        stockItems.length
      ) {
        movements = await this.seedStockMovements(
          warehouses,
          purchases,
          orders,
        );
      }

      if (
        !this.config.skipLoyaltyTransactions &&
        customers.length &&
        orders.length
      ) {
        loyaltyTransactions = await this.seedLoyaltyTransactions(
          customers,
          orders,
        );
      }

      if (!this.config.skipNotifications) {
        notifications = await this.seedNotifications();
      }

      if (!this.config.skipNotificationLogs) {
        await this.seedNotificationLogs();
      }

      if (!this.config.skipAuditLogs) {
        await this.seedAuditLogs();
      }

      await this.queryRunner.commitTransaction();

      console.log("\n🎉 SEED COMPLETED SUCCESSFULLY!");
      console.log(`   Warehouses: ${warehouses.length}`);
      console.log(`   Categories: ${categories.length}`);
      console.log(`   Suppliers: ${suppliers.length}`);
      console.log(`   Customers: ${customers.length}`);
      console.log(`   Products: ${products.length}`);
      console.log(`   Variants: ${variants.length}`);
      console.log(`   Images: ${images.length}`);
      console.log(`   Stock Items: ${stockItems.length}`);
      console.log(`   Purchases: ${purchases.length}`);
      console.log(`   Purchase Items: ${purchaseItems.length}`);
      console.log(`   Orders: ${orders.length}`);
      console.log(`   Order Items: ${orderItems.length}`);
      console.log(`   Stock Movements: ${movements.length}`);
      console.log(`   Loyalty Transactions: ${loyaltyTransactions.length}`);
      console.log(`   Notifications: ${notifications.length}`);
      console.log(`   Notification Logs: ${this.config.notificationLogCount}`);
      console.log(`   Audit Logs: ${this.config.auditLogCount}`);
    } catch (error) {
      console.error("\n❌ Seeding failed – rolling back...", error);
      if (this.queryRunner) await this.queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await this.destroy();
    }
  }
}

// ========== COMMAND LINE HANDLER ==========
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--clear-only":
        config.clearOnly = true;
        break;
      case "--warehouses":
        config.skipWarehouses = false;
        config.warehouseCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.warehouseCount;
        break;
      case "--categories":
        config.skipCategories = false;
        config.categoryCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.categoryCount;
        break;
      case "--suppliers":
        config.skipSuppliers = false;
        config.supplierCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.supplierCount;
        break;
      case "--customers":
        config.skipCustomers = false;
        config.customerCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.customerCount;
        break;
      case "--products":
        config.skipProducts = false;
        config.productCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.productCount;
        break;
      case "--variants":
        config.skipVariants = false;
        config.variantPerProduct =
          parseInt(args[++i]) || DEFAULT_CONFIG.variantPerProduct;
        break;
      case "--images":
        config.skipImages = false;
        config.imagePerProduct =
          parseInt(args[++i]) || DEFAULT_CONFIG.imagePerProduct;
        break;
      case "--stock-items":
        config.skipStockItems = false;
        // no count, depends on others
        break;
      case "--purchases":
        config.skipPurchases = false;
        config.purchaseCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.purchaseCount;
        break;
      case "--orders":
        config.skipOrders = false;
        config.orderCount = parseInt(args[++i]) || DEFAULT_CONFIG.orderCount;
        break;
      case "--stock-movements":
        config.skipStockMovements = false;
        config.stockMovementCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.stockMovementCount;
        break;
      case "--loyalty-transactions":
        config.skipLoyaltyTransactions = false;
        config.loyaltyTransactionCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.loyaltyTransactionCount;
        break;
      case "--notifications":
        config.skipNotifications = false;
        config.notificationCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.notificationCount;
        break;
      case "--notification-logs":
        config.skipNotificationLogs = false;
        config.notificationLogCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.notificationLogCount;
        break;
      case "--audit-logs":
        config.skipAuditLogs = false;
        config.auditLogCount =
          parseInt(args[++i]) || DEFAULT_CONFIG.auditLogCount;
        break;
      // Skip flags
      case "--skip-warehouses":
        config.skipWarehouses = true;
        break;
      case "--skip-categories":
        config.skipCategories = true;
        break;
      case "--skip-suppliers":
        config.skipSuppliers = true;
        break;
      case "--skip-customers":
        config.skipCustomers = true;
        break;
      case "--skip-products":
        config.skipProducts = true;
        break;
      case "--skip-variants":
        config.skipVariants = true;
        break;
      case "--skip-images":
        config.skipImages = true;
        break;
      case "--skip-stock-items":
        config.skipStockItems = true;
        break;
      case "--skip-purchases":
        config.skipPurchases = true;
        break;
      case "--skip-orders":
        config.skipOrders = true;
        break;
      case "--skip-stock-movements":
        config.skipStockMovements = true;
        break;
      case "--skip-loyalty-transactions":
        config.skipLoyaltyTransactions = true;
        break;
      case "--skip-notifications":
        config.skipNotifications = true;
        break;
      case "--skip-notification-logs":
        config.skipNotificationLogs = true;
        break;
      case "--skip-audit-logs":
        config.skipAuditLogs = true;
        break;
      case "--help":
        console.log(`
Usage: node seedData.js [options]

Seed the Stashify database with test data.

Options:
  --clear-only                Only wipe database, do not seed.
  --warehouses [count]        Seed warehouses (default: 3)
  --categories [count]        Seed categories (default: 8)
  --suppliers [count]         Seed suppliers (default: 10)
  --customers [count]         Seed customers (default: 30)
  --products [count]          Seed products (default: 50)
  --variants [avg]            Average variants per product (default: 2)
  --images [avg]              Average images per product (default: 2)
  --stock-items               Seed stock items (no count, based on products/warehouses)
  --purchases [count]         Seed purchases (default: 20)
  --orders [count]            Seed orders (default: 100)
  --stock-movements [count]   Seed stock movements (default: 200)
  --loyalty-transactions [count] Seed loyalty transactions (default: 80)
  --notifications [count]     Seed notifications (default: 40)
  --notification-logs [count] Seed notification logs (default: 50)
  --audit-logs [count]        Seed audit logs (default: 60)

Skip flags:
  --skip-warehouses, --skip-categories, --skip-suppliers, --skip-customers,
  --skip-products, --skip-variants, --skip-images, --skip-stock-items,
  --skip-purchases, --skip-orders, --skip-stock-movements,
  --skip-loyalty-transactions, --skip-notifications, --skip-notification-logs,
  --skip-audit-logs

Examples:
  node seedData.js --products 20 --orders 50
  node seedData.js --clear-only
  node seedData.js --skip-loyalty-transactions --skip-notifications
`);
        process.exit(0);
    }
  }
  return config;
}

// ========== EXECUTION ==========
if (require.main === module) {
  const config = parseArgs();
  const seeder = new InventorySeeder(config);
  seeder.run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = { InventorySeeder, DEFAULT_CONFIG };

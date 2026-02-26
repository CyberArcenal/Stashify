# 📘 Full Plan – Inventory Management System (.exe)

## 🎯 Project Overview

A lightweight, offline-first **Inventory Management System** packaged as a Windows `.exe` app.  
Target users: **mini businesses** (sari-sari store, small retailers, online sellers) na gusto ng simple pero functional na inventory tool.  
Distribution: **Shopee digital product listing** (installer + quick start guide + license key).

---

## 📂 Core Modules (Side Nav Links)

1. **Dashboard**
   - KPIs: Total Products, Low Stock, Out of Stock
   - Recent Orders & Purchases
   - Quick Actions: Add Product, Stock In, Stock Out

2. **Products**
   - Table view: Name, SKU, Category, Quantity, Unit Price, Status
   - CRUD operations (Add/Edit/Delete)
   - Search & Filter

3. **Orders (Sales)**
   - Order list: Order ID, Date, Customer, Items, Total, Status
   - Auto-deduct stock when completed
   - Manual entry + status updates

4. **Purchases**
   - Purchase list: Purchase ID, Date, Supplier, Items, Total, Status
   - Auto-add stock when received
   - Manual entry + status updates

5. **Stock Movements**
   - Ledger view: Date, Type (In/Out), Qty, Reference, Notes
   - Audit trail for all stock changes

6. **Reports**
   - Export to CSV/Excel
   - Sales vs Purchases summary
   - Low stock report

7. **Settings**
   - Company info
   - Stock threshold defaults
   - Backup/restore database
   - License info (Basic vs Pro)

---

## 🛠️ Tech Stack

- **Frontend:** React (UI components, table-centric design)
- **Wrapper:** Electron (or Tauri for smaller build size) → `.exe`
- **Database:** SQLite (local, portable, zero-config)
- **Architecture:**
  - UI Layer (React)
  - Service Layer (business logic: stock in/out, alerts)
  - Data Layer (SQLite repositories)

---

## 🗄️ Database Schema (SQLite)

**Products**

- id (PK)
- name
- sku
- category
- quantity
- unit_price
- low_stock_threshold

**Orders**

- id (PK)
- date
- customer_name
- total_amount
- status

**OrderItems**

- id (PK)
- order_id (FK)
- productId (FK)
- quantity
- price

**Purchases**

- id (PK)
- date
- supplier_name
- total_cost
- status

**PurchaseItems**

- id (PK)
- purchaseId (FK)
- productId (FK)
- quantity
- cost

**StockMovements**

- id (PK)
- date
- productId (FK)
- type (IN/OUT)
- quantity
- reference (OrderID/PurchaseID/Manual)
- notes

**Settings**

- id (PK)
- company_name
- default_low_stock_threshold
- license_key

---

## 🎨 UI/UX Design

- **Minimalist, table-centric** (Excel-like but cleaner)
- **Color coding:**
  - 🟢 In stock
  - 🟡 Low stock
  - 🔴 Out of stock
- **Quick actions always visible**
- **Dashboard cards + small chart** for overview

---

## 🚀 Roadmap

**Phase 1 (MVP – Launch on Shopee)**

- Products CRUD
- Orders (manual entry, auto-deduct)
- Purchases (manual entry, auto-add)
- Stock Movements ledger
- Low stock alerts
- CSV/Excel export
- Backup/restore

**Phase 2 (Enhancements)**

- Supplier & Customer database
- Barcode scanning
- User roles (admin/staff)
- Printable receipts/invoices

**Phase 3 (Advanced)**

- Multi-branch support
- Cloud sync
- Auto-update system

---

## 📦 Packaging & Delivery

- Build `.exe` installer (Electron Builder / Tauri build)
- Bundle with Quick Start Guide (PDF)
- Deliver via Shopee chat/email (download link + license key)
- Variations:
  - _Basic_ (single user, core features)
  - _Pro_ (multi-user, extra reports)

---

## 📈 Marketing Angle (Shopee Listing)

- **Title:** “Simple Inventory Management Software – Lifetime License (Windows)”
- **Description Highlights:**
  - Track stock in/out easily
  - Low stock alerts
  - Exportable reports
  - One-time payment, lifetime use
- **Visuals:** Screenshots of dashboard, product table, reports

---

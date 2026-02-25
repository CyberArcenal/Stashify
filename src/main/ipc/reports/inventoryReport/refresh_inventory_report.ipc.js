// src/main/ipc/inventoryReport/refresh_inventory_report.ipc.js
//@ts-check
const getInventoryReport = require("./get/inventory_report.ipc");


module.exports = async (params = {}) => {
  // Simply call the same function as get (could add cache busting later)
  return await getInventoryReport(params);
};
// src/main/ipc/tax/get/all.ipc.js
//@ts-check
const taxService = require("../../../../../services/Tax");

// @ts-ignore
module.exports = async (params) => {
  try {
    const filters = {
      is_enabled: params.is_enabled,
      type: params.type,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page,
      limit: params.limit,
    };

    const taxes = await taxService.findAll(filters);

    return {
      status: true,
      message: "Taxes retrieved successfully",
      data: taxes,
    };
  } catch (error) {
    console.error("Error in getAllTaxes:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to retrieve taxes",
      data: null,
    };
  }
};
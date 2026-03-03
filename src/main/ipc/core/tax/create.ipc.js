// src/main/ipc/tax/create.ipc.js
//@ts-check

const taxService = require("../../../../services/Tax");

// @ts-ignore
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (
      !params.name ||
      typeof params.name !== "string" ||
      params.name.trim() === ""
    ) {
      return {
        status: false,
        message: "Tax name is required and must be a non-empty string.",
        data: null,
      };
    }

    if (
      !params.code ||
      typeof params.code !== "string" ||
      params.code.trim() === ""
    ) {
      return {
        status: false,
        message: "Tax code is required and must be a non-empty string.",
        data: null,
      };
    }

    if (
      params.rate === undefined ||
      params.rate === null ||
      isNaN(params.rate) ||
      params.rate < 0
    ) {
      return {
        status: false,
        message: "Tax rate must be a non-negative number.",
        data: null,
      };
    }

    // Validate type
    if (params.type && !["percentage", "fixed"].includes(params.type)) {
      return {
        status: false,
        message: "Tax type must be either 'percentage' or 'fixed'.",
        data: null,
      };
    }

    const taxData = {
      name: params.name.trim(),
      code:
        params.code === "other"
          ? params.customCode
            ? params.customCode.trim().toLowerCase().replace(/\s+/g, "_")
            : "other"
          : params.code.trim().toLowerCase().replace(/\s+/g, "_"),
      rate: Number(params.rate),
      type: params.type || "percentage",
      is_enabled: params.is_enabled !== undefined ? params.is_enabled : true,
      is_default: params.is_default || false,
      description: params.description?.trim(),
    };

    const newTax = await taxService.create(taxData, user);

    return {
      status: true,
      message: "Tax created successfully",
      data: newTax,
    };
  } catch (error) {
    console.error("Error in createTax:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to create tax",
      data: null,
    };
  }
};

// src/main/ipc/tax/delete.ipc.js
const taxService = require("../../../../services/Tax");

module.exports = async (params, queryRunner, user = "system") => {
  try {
    const { id } = params;

    if (!id || isNaN(id) || id <= 0) {
      return {
        status: false,
        message: "Invalid tax ID",
        data: null,
      };
    }

    const deletedTax = await taxService.delete(Number(id), user);

    return {
      status: true,
      message: "Tax deleted successfully",
      data: deletedTax,
    };
  } catch (error) {
    console.error("Error in deleteTax:", error);
    return {
      status: false,
      message: error.message || "Failed to delete tax",
      data: null,
    };
  }
};
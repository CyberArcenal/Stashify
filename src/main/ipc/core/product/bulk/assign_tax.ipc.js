const productService = require("../../../../../services/Product");

//@ts-check
module.exports = async (params, queryRunner, user = "system") => {
  try {
    const result = await productService.bulkUpdateTaxes(
      params.productIds,
      params.taxIds,
      params.operation,
      user,
    );
    return { status: true, message: "Bulk update completed", data: result };
  } catch (error) {
    console.error("Bulk assign taxes error:", error);
    return { status: false, message: error.message, data: null };
  }
};

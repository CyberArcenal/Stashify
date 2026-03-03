module.exports = async (params, queryRunner, user = "system") => {
  try {
    const result = await productVariantService.bulkUpdateTaxes(
      params.variantIds,
      params.taxIds,
      params.operation,
      'system'
    );
    return { status: true, message: 'Bulk update completed', data: result };
  } catch (error) {
    console.error('Bulk assign taxes error:', error);
    return { status: false, message: error.message, data: null };
  }
};
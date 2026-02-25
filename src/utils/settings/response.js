/**
 * @param {{ value: string; label: string; description: string; icon: string; }[]} data
 * @param {string} message
 */
function successResponse(data, message) {
  return {
    status: true,
    message: message,
    data: data,
    timestamp: new Date().toISOString(),
  };
}


/**
 * @param {string} message
 */
function errorResponse(message, statusCode = 500) {
  return {
    status: false,
    message: message,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
    errorResponse,
    successResponse
}
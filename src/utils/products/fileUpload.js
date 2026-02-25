// electron-app/main/utils/fileUpload.js
//@ts-check
const { app } = require("electron");
const path = require("path");
const fs = require("fs").promises;

class FileUploadHandler {
  /**
   * @param {{ originalname: any; name: any; buffer: any; data: any; }} file
   * @param {{ toString: () => string; }} productId
   */
  static async saveProductImage(file, productId) {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(
        app.getPath("userData"),
        "uploads",
        "products",
        productId.toString()
      );
      await fs.mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const fileExt = path.extname(file.originalname || file.name);
      const fileName = `product_${productId}_${Date.now()}${fileExt}`;
      const filePath = path.join(uploadsDir, fileName);

      // Save file
      await fs.writeFile(filePath, file.buffer || file.data);

      // Return relative path and URL
      return {
        image_path: filePath,
        image_url: `/uploads/products/${productId}/${fileName}`,
      };
    } catch (error) {
      console.error("Error saving product image:", error);
      throw error;
    }
  }
}

module.exports = { FileUploadHandler };

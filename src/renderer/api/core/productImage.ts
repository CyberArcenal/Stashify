// src/renderer/api/productImageAPI.ts
// @ts-check

import type { Product } from "./product";

/**
 * ProductImage API – naglalaman ng lahat ng tawag sa IPC para sa product image operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllProductImages
 * - getProductImageById
 * - createProductImage
 * - updateProductImage
 * - deleteProductImage
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa ProductImage entity)
// ----------------------------------------------------------------------

export interface ProductImage {
  id: number;
  image_url: string | null;
  image_path: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;        // ISO date string
  updated_at: string;        // ISO date string
  is_deleted: boolean;
  // Optional relation
  product?: Product;
}

// Para sa pag-create ng product image
export interface ProductImageCreateData {
  productId: number;
  image_url?: string | null;
  image_path?: string | null;
  alt_text?: string | null;
  is_primary?: boolean;       // default false
  sort_order?: number;         // default 0
}

// Para sa pag-update ng product image
export interface ProductImageUpdateData {
  productId?: number;
  image_url?: string | null;
  image_path?: string | null;
  alt_text?: string | null;
  is_primary?: boolean;
  sort_order?: number;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface ProductImagesResponse {
  status: boolean;
  message: string;
  data: ProductImage[];
}

export interface ProductImageResponse {
  status: boolean;
  message: string;
  data: ProductImage;
}

export interface DeleteProductImageResponse {
  status: boolean;
  message: string;
  data: ProductImage;   // ang na-soft delete na product image
}

// ----------------------------------------------------------------------
// 🧠 ProductImageAPI Class
// ----------------------------------------------------------------------

class ProductImageAPI {
  /**
   * Pangunahing tawag sa IPC para sa productImage channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.productImage) {
      throw new Error("Electron API (productImage) not available");
    }
    return window.backendAPI.productImage({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng product images na may opsyon sa pag-filter.
   * @param params.productId - Filter ayon sa product ID
   * @param params.is_primary - Filter ayon sa primary status
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'sort_order')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'ASC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    productId?: number;
    is_primary?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<ProductImagesResponse> {
    try {
      const response = await this.call<ProductImagesResponse>('getAllProductImages', params || {});
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch product images');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product images');
    }
  }

  /**
   * Kunin ang isang product image ayon sa ID.
   * @param id - Product image ID
   */
  async getById(id: number): Promise<ProductImageResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<ProductImageResponse>('getProductImageById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch product image');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product image');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong product image.
   * @param data - Product image data (productId ay required, at dapat may image_url o image_path)
   */
  async create(data: ProductImageCreateData): Promise<ProductImageResponse> {
    try {
      if (!data.productId || data.productId <= 0) throw new Error('Valid productId is required');
      if (!data.image_url && !data.image_path) {
        throw new Error('Either image_url or image_path must be provided');
      }
      const response = await this.call<ProductImageResponse>('createProductImage', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create product image');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create product image');
    }
  }

  /**
   * I-update ang isang existing product image.
   * @param id - Product image ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: ProductImageUpdateData): Promise<ProductImageResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<ProductImageResponse>('updateProductImage', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update product image');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update product image');
    }
  }

  /**
   * Mag-soft delete ng product image (itakda ang is_deleted = true).
   * @param id - Product image ID
   */
  async delete(id: number): Promise<DeleteProductImageResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteProductImageResponse>('deleteProductImage', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete product image');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete product image');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.productImage);
  }

  /**
   * Kunin ang lahat ng images para sa isang partikular na product.
   * @param productId - Product ID
   * @param params - Karagdagang parameters (pagination, sorting, primary filter)
   */
  async getByProduct(productId: number, params?: {
    is_primary?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<ProductImagesResponse> {
    return this.getAll({ productId, ...params });
  }

  /**
   * Itakda ang isang image bilang primary para sa isang product.
   * Awtomatikong ia-update ang ibang images ng product para hindi primary.
   * @param productId - Product ID
   * @param imageId - Image ID na gustong gawing primary
   */
  async setPrimary(productId: number, imageId: number): Promise<ProductImageResponse> {
    // Kukunin muna ang lahat ng images ng product
    const images = await this.getByProduct(productId);
    if (!images.status) throw new Error('Failed to fetch product images');

    // I-update ang target image para maging primary
    const targetImage = images.data.find(img => img.id === imageId);
    if (!targetImage) throw new Error('Image not found for this product');

    // I-update ang target image
    const updated = await this.update(imageId, { is_primary: true });

    // I-update ang ibang images para hindi primary (kung may iba pang primary)
    // Dahil hindi ito atomic sa isang tawag, maaaring gawin nang paisa-isa
    const otherImages = images.data.filter(img => img.id !== imageId && img.is_primary);
    for (const img of otherImages) {
      await this.update(img.id, { is_primary: false }).catch(() => {});
    }

    return updated;
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const productImageAPI = new ProductImageAPI();
export default productImageAPI;
// src/renderer/api/categoryAPI.ts
// @ts-check

/**
 * Category API – naglalaman ng lahat ng tawag sa IPC para sa category operations.
 * Naka-align sa backend na may mga sumusunod na method:
 * - getAllCategories
 * - getCategoryById
 * - createCategory
 * - updateCategory
 * - deleteCategory
 */

// ----------------------------------------------------------------------
// 📦 Types & Interfaces (batay sa Category entity)
// ----------------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  color: string | null;
  created_at: string;        // ISO date string
  updated_at: string;        // ISO date string
  is_active: boolean;
  // Optional relational fields (maaaring hindi laging kasama)
  parent?: Category | null;
  children?: Category[];
  parentId?: number;
}

// Para sa create/update, gumagamit tayo ng partial data
export interface CategoryCreateData {
  name: string;
  slug?: string;
  description?: string | null;
  image_path?: string | null;
  color?: string | null;
  parentId?: number | null;
  is_active?: boolean;
}

export interface CategoryUpdateData {
  name?: string;
  slug?: string;
  description?: string | null;
  image_path?: string | null;
  color?: string | null;
  parentId?: number | null;
  is_active?: boolean;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces (mirror IPC response format)
// ----------------------------------------------------------------------

export interface CategoriesResponse {
  status: boolean;
  message: string;
  data: Category[];           // array ng categories (walang pagination metadata)
}

export interface CategoryResponse {
  status: boolean;
  message: string;
  data: Category;
}

export interface DeleteCategoryResponse {
  status: boolean;
  message: string;
  data: Category;             // ang na-delete (soft) na category
}

// Para sa mga utility method na nangangailangan ng boolean response
export interface ValidationResponse {
  status: boolean;
  message: string;
  data: boolean;
}

// ----------------------------------------------------------------------
// 🧠 CategoryAPI Class
// ----------------------------------------------------------------------

class CategoryAPI {
  /**
   * Pangunahing tawag sa IPC para sa category channel.
   * @param method - Pangalan ng method (ipinapasa sa backend)
   * @param params - Mga parameter para sa method
   * @returns {Promise<any>} - Response mula sa backend
   */
  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.category) {
      throw new Error("Electron API (category) not available");
    }
    return window.backendAPI.category({ method, params });
  }

  // --------------------------------------------------------------------
  // 🔎 READ METHODS
  // --------------------------------------------------------------------

  /**
   * Kunin ang lahat ng categories na may opsyon sa pag-filter.
   * @param params.is_active - Filter ayon sa active status
   * @param params.search - Hanapin sa name o description
   * @param params.sortBy - Field na pagbabasehan ng sorting (default: 'created_at')
   * @param params.sortOrder - 'ASC' o 'DESC' (default: 'DESC')
   * @param params.page - Page number (1-based)
   * @param params.limit - Bilang ng items kada page
   */
  async getAll(params?: {
    is_active?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<CategoriesResponse> {
    try {
      const response = await this.call<CategoriesResponse>('getAllCategories', params || {});
      // console.log(response)
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch categories');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch categories');
    }
  }

  /**
   * Kunin ang isang category ayon sa ID.
   * @param id - Category ID
   */
  async getById(id: number): Promise<CategoryResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<CategoryResponse>('getCategoryById', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to fetch category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch category');
    }
  }

  // --------------------------------------------------------------------
  // ✍️ WRITE METHODS
  // --------------------------------------------------------------------

  /**
   * Gumawa ng bagong category.
   * @param data - Category data (name ay required)
   */
  async create(data: CategoryCreateData): Promise<CategoryResponse> {
    try {
      if (!data.name || data.name.trim() === '') {
        throw new Error('Category name is required');
      }
      const response = await this.call<CategoryResponse>('createCategory', data);
      if (response.status) return response;
      throw new Error(response.message || 'Failed to create category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create category');
    }
  }

  /**
   * I-update ang isang existing category.
   * @param id - Category ID
   * @param data - Mga field na gustong baguhin
   */
  async update(id: number, data: CategoryUpdateData): Promise<CategoryResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<CategoryResponse>('updateCategory', { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to update category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update category');
    }
  }

  /**
   * Mag-soft delete ng category (itakda ang is_active = false).
   * @param id - Category ID
   */
  async delete(id: number): Promise<DeleteCategoryResponse> {
    try {
      if (!id || id <= 0) throw new Error('Invalid ID');
      const response = await this.call<DeleteCategoryResponse>('deleteCategory', { id });
      if (response.status) return response;
      throw new Error(response.message || 'Failed to delete category');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete category');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * I-validate kung available ang backend API.
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.category);
  }

  /**
   * Kunin ang category tree (hierarchical) – manual na ginagawa sa client.
   * Hindi ito direktang sinusuportahan ng backend, kaya kailangan kunin
   * ang lahat ng categories at i-build ang tree.
   * @param categories - (opsyonal) kung mayroon nang listahan, gamitin ito
   */
  async getTree(categories?: Category[]): Promise<Category[]> {
    try {
      const list = categories || (await this.getAll()).data;
      // I-group ayon sa parentId
      const map = new Map<number, Category & { children: Category[] }>();
      const roots: Category[] = [];

      // Initialize ang bawat category na may children array
      list.forEach(cat => {
        map.set(cat.id, { ...cat, children: [] });
      });

      // I-assign ang children sa kani-kanilang parent
      list.forEach(cat => {
        const item = map.get(cat.id)!;
        if (cat.parent && cat.parent.id) {
          const parent = map.get(cat.parent.id);
          if (parent) parent.children.push(item);
        } else {
          roots.push(item);
        }
      });

      return roots;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to build category tree');
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const categoryAPI = new CategoryAPI();
export default categoryAPI;
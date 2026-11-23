import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../types/categories.types";

export const categoriesService = {
  async list(): Promise<Category[]> {
    const data = await apiClient.get<Category[]>(ENDPOINTS.categories.list);
    return Array.isArray(data) ? data : [];
  },

  async create(payload: CreateCategoryInput): Promise<Category> {
    return apiClient.post<Category>(ENDPOINTS.categories.create, payload);
  },

  async update(id: string, payload: UpdateCategoryInput): Promise<Category> {
    return apiClient.patch<Category>(ENDPOINTS.categories.update(id), payload);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.categories.remove(id));
  },
};

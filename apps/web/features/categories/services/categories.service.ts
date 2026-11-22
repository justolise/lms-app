import { apiClient } from "@/lib/api/client";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../types/categories.types";

export const categoriesService = {
  async list(): Promise<Category[]> {
    const data = await apiClient.get<Category[]>("/api/categories");
    return Array.isArray(data) ? data : [];
  },

  async create(payload: CreateCategoryInput): Promise<Category> {
    return apiClient.post<Category>("/api/categories", payload);
  },

  async update(id: string, payload: UpdateCategoryInput): Promise<Category> {
    return apiClient.patch<Category>(`/api/categories/${id}`, payload);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/categories/${id}`);
  },
};

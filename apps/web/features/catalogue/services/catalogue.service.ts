import { apiClient } from "@/lib/api/client";
import type {
  CatalogueItem,
  CatalogueSearchParams,
  CopyItem,
  CreateCatalogueItemInput,
  CreateCopyInput,
  IsbnLookupResult,
} from "../types/catalogue.types";

export const catalogueService = {
  async list(params?: CatalogueSearchParams): Promise<CatalogueItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.q?.trim()) searchParams.set("q", params.q.trim());
    if (params?.format) searchParams.set("format", params.format);
    if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
    if (params?.availableOnly) searchParams.set("availableOnly", "true");

    const endpoint = searchParams.toString()
      ? `/api/catalogue/search?${searchParams.toString()}`
      : "/api/catalogue";

    const data = await apiClient.get<
      CatalogueItem[] | { items: CatalogueItem[] }
    >(endpoint);
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray((data as { items: CatalogueItem[] }).items)) {
      return (data as { items: CatalogueItem[] }).items;
    }
    return [];
  },

  async getById(id: string): Promise<CatalogueItem> {
    return apiClient.get<CatalogueItem>(`/api/catalogue/${id}`);
  },

  async create(payload: CreateCatalogueItemInput): Promise<CatalogueItem> {
    return apiClient.post<CatalogueItem>("/api/catalogue", payload);
  },

  async update(
    id: string,
    payload: Partial<CreateCatalogueItemInput>,
  ): Promise<CatalogueItem> {
    return apiClient.patch<CatalogueItem>(`/api/catalogue/${id}`, payload);
  },

  async archive(id: string): Promise<void> {
    await apiClient.delete(`/api/catalogue/${id}`);
  },

  async lookupIsbn(isbn: string): Promise<IsbnLookupResult> {
    return apiClient.post<IsbnLookupResult>("/api/catalogue/isbn-lookup", {
      isbn,
    });
  },

  async addCopy(
    catalogueItemId: string,
    payload: CreateCopyInput,
  ): Promise<CopyItem> {
    return apiClient.post<CopyItem>(
      `/api/catalogue/${catalogueItemId}/copies`,
      payload,
    );
  },

  async updateCopyStatus(
    catalogueItemId: string,
    copyId: string,
    status: string,
  ): Promise<CopyItem> {
    return apiClient.patch<CopyItem>(
      `/api/catalogue/${catalogueItemId}/copies/${copyId}`,
      {
        status,
      },
    );
  },

  async withdrawCopy(catalogueItemId: string, copyId: string): Promise<void> {
    await apiClient.delete(
      `/api/catalogue/${catalogueItemId}/copies/${copyId}`,
    );
  },
};

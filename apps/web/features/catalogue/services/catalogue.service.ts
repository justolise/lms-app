import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
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

    const hasFilters = searchParams.toString().length > 0;
    const endpoint = hasFilters
      ? `${ENDPOINTS.catalogue.search}?${searchParams.toString()}`
      : ENDPOINTS.catalogue.list;

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
    return apiClient.get<CatalogueItem>(ENDPOINTS.catalogue.details(id));
  },

  async create(payload: CreateCatalogueItemInput): Promise<CatalogueItem> {
    return apiClient.post<CatalogueItem>(ENDPOINTS.catalogue.create, payload);
  },

  async update(
    id: string,
    payload: Partial<CreateCatalogueItemInput>,
  ): Promise<CatalogueItem> {
    return apiClient.patch<CatalogueItem>(
      ENDPOINTS.catalogue.update(id),
      payload,
    );
  },

  async archive(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.catalogue.archive(id));
  },

  async lookupIsbn(isbn: string): Promise<IsbnLookupResult> {
    return apiClient.post<IsbnLookupResult>(ENDPOINTS.catalogue.isbnLookup, {
      isbn,
    });
  },

  async addCopy(
    catalogueItemId: string,
    payload: CreateCopyInput,
  ): Promise<CopyItem> {
    return apiClient.post<CopyItem>(
      ENDPOINTS.catalogue.copies(catalogueItemId),
      payload,
    );
  },

  async updateCopyStatus(
    catalogueItemId: string,
    copyId: string,
    status: string,
    reason: string,
  ): Promise<CopyItem> {
    return apiClient.patch<CopyItem>(
      ENDPOINTS.catalogue.copyStatus(catalogueItemId, copyId),
      { status, reason },
    );
  },

  async withdrawCopy(
    catalogueItemId: string,
    copyId: string,
    reason?: string,
  ): Promise<void> {
    const query = reason?.trim()
      ? `?reason=${encodeURIComponent(reason.trim())}`
      : "";
    await apiClient.delete(
      `${ENDPOINTS.catalogue.withdrawCopy(catalogueItemId, copyId)}${query}`,
    );
  },
};

import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CancelHoldInput,
  CreateHoldInput,
  Hold,
} from "../types/holds.types";

export async function placeHold(input: CreateHoldInput): Promise<Hold> {
  return apiClient.post<Hold>(ENDPOINTS.holds.create, input);
}

export async function cancelHold(
  holdId: string,
  input?: CancelHoldInput,
): Promise<{ success: boolean; message: string }> {
  return apiClient.request<{ success: boolean; message: string }>(
    ENDPOINTS.holds.cancel(holdId),
    { method: "DELETE", body: input || {} },
  );
}

export async function listHolds(filters?: {
  catalogueItemId?: string;
  userId?: string;
  status?: string;
}): Promise<Hold[]> {
  return apiClient.get<Hold[]>(ENDPOINTS.holds.list, {
    catalogueItemId: filters?.catalogueItemId,
    userId: filters?.userId,
    status: filters?.status,
  });
}

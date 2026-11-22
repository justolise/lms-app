import { apiClient } from "@/lib/api/client";
import type {
  CancelHoldInput,
  CreateHoldInput,
  Hold,
} from "../types/holds.types";

export async function placeHold(input: CreateHoldInput): Promise<Hold> {
  return apiClient.post<Hold>("/api/holds", input);
}

export async function cancelHold(
  holdId: string,
  input?: CancelHoldInput,
): Promise<{ success: boolean; message: string }> {
  return apiClient.request<{ success: boolean; message: string }>(
    `/api/holds/${holdId}`,
    { method: "DELETE", body: input || {} },
  );
}

export async function listHolds(filters?: {
  catalogueItemId?: string;
  userId?: string;
  status?: string;
}): Promise<Hold[]> {
  return apiClient.get<Hold[]>("/api/holds", {
    catalogueItemId: filters?.catalogueItemId,
    userId: filters?.userId,
    status: filters?.status,
  });
}

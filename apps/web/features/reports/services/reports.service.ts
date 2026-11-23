import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { DashboardReportResponse } from "../types/reports.types";

export const reportsService = {
  getDashboard(): Promise<DashboardReportResponse> {
    return apiClient.get<DashboardReportResponse>(ENDPOINTS.reports.dashboard);
  },
};

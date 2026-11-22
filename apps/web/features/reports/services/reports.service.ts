import { apiClient } from "@/lib/api/client";
import type { DashboardReportResponse } from "../types/reports.types";

export const reportsService = {
  getDashboard(): Promise<DashboardReportResponse> {
    return apiClient.get<DashboardReportResponse>("/api/reports/dashboard");
  },
};

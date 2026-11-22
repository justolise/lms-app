export interface DashboardStats {
  activeLoansCount: number;
  overdueLoansCount: number;
  activeHoldsCount: number;
  totalCatalogueTitles: number;
  totalCopiesCount: number;
  availableCopiesCount: number;
  newMembersThisMonth: number;
  outstandingFinesMinorUnits: number;
  collectedMonthMinorUnits: number;
  outstandingFinesKes: number;
  collectedFinesThisMonthKes: number;
}

export interface PopularTitleItem {
  id: string;
  title: string;
  author: string | null;
  format: string;
  coverUrl: string | null;
  borrowCount: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'CHECKOUT' | 'RETURN' | 'HOLD_PLACED' | 'FINE_PAYMENT';
  description: string;
  patronName: string;
  timestamp: string;
}

export interface DashboardReportResponse {
  stats: DashboardStats;
  popularTitles: PopularTitleItem[];
  recentActivity: RecentActivityItem[];
}

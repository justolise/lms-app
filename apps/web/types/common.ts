export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  statusCode?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

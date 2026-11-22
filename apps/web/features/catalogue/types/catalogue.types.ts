export interface CategoryOption {
  id: string;
  name: string;
}

export type CopyCondition = "NEW" | "GOOD" | "FAIR" | "POOR";

export type CopyStatus =
  | "AVAILABLE"
  | "ON_LOAN"
  | "RESERVED"
  | "IN_TRANSIT"
  | "LOST"
  | "DAMAGED"
  | "WITHDRAWN";

export interface CopyItem {
  id: string;
  barcode: string;
  condition: CopyCondition;
  status: CopyStatus;
  shelfLocation: string | null;
  acquiredAt: string | null;
  notes?: string | null;
}

export interface CatalogueItem {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn13: string | null;
  isbn10: string | null;
  publisher: string | null;
  publishedYear: number | null;
  language: string;
  format: string;
  coverUrl: string | null;
  callNumber: string | null;
  shelfLocation: string | null;
  categoryId: string | null;
  subjects: string[];
  status: string;
  availableCopies: number;
  totalCopies: number;
  createdAt: string;
  updatedAt: string;
  copies?: CopyItem[];
}

export interface CatalogueSearchParams {
  q?: string;
  format?: string;
  categoryId?: string;
  availableOnly?: boolean;
}

export interface CreateCatalogueItemInput {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedYear?: number;
  language?: string;
  format: string;
  callNumber?: string;
  shelfLocation?: string;
  categoryId?: string;
  subjects?: string[];
  description?: string;
  coverUrl?: string;
  isbn13?: string;
  isbn10?: string;
}

export interface CreateCopyInput {
  barcode: string;
  condition: string;
  shelfLocation?: string;
}

export interface IsbnLookupResult {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedYear?: number | string;
  description?: string;
  coverUrl?: string;
  isbn13?: string;
  isbn10?: string;
}

export const ITEM_FORMATS = [
  "BOOK",
  "PERIODICAL",
  "REFERENCE",
  "AUDIO",
  "VIDEO",
  "OTHER",
] as const;

export const COPY_CONDITIONS: CopyCondition[] = ["NEW", "GOOD", "FAIR", "POOR"];

export const COPY_STATUSES: CopyStatus[] = [
  "AVAILABLE",
  "ON_LOAN",
  "RESERVED",
  "IN_TRANSIT",
  "LOST",
  "DAMAGED",
  "WITHDRAWN",
];

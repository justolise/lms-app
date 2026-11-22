export interface LibraryProfile {
  id: string;
  name: string;
  libraryCode: string;
  status: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
  website: string | null;
  description: string | null;
  borrowingRulesSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLibraryProfileInput {
  name?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  openingHours?: string;
  website?: string;
  description?: string;
  borrowingRulesSummary?: string;
}

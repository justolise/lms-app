export interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  parentId?: string;
}

export interface UpdateCategoryInput {
  name: string;
  description?: string | null;
  parentId?: string | null;
}

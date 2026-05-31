export type LibraryItemType = "candidate" | "report" | "run";

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  title: string;
  description: string;
  href: string;
  savedAt: string;
  updatedAt: string;
  sourceId?: string;
  parentId?: string;
  score?: number;
  tags: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface LibraryItemInput {
  id: string;
  type: LibraryItemType;
  title: string;
  description?: string;
  href: string;
  sourceId?: string;
  parentId?: string;
  score?: number;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface LibraryState {
  updatedAt: string;
  items: LibraryItem[];
}

export interface User {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  owner: string;
  databaseDialect: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersion {
  id: string;
  modelId: string;
  dbmlContent: string;
  versionNumber: number;
  createdBy: string;
  createdAt: string;
  changeSummary?: string;
}

export interface Column {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  defaultValue?: string;
}

export interface Table {
  name: string;
  columns: Column[];
  description?: string;
  schema?: string;
}

export interface Relationship {
  from: string; // table name
  to: string; // table name
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
}

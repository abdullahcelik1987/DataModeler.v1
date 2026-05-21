// DBML related types

export interface DbmlTableNodeDto {
  tableName: string;
  tableAlias?: string;
  note?: string;
  columns: DbmlColumnDto[];
}

export interface DbmlColumnDto {
  columnName: string;
  columnType: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isNotNull: boolean;
  isAutoIncrement: boolean;
  defaultValue?: string;
  note?: string;
}

export interface DbmlRelationshipDto {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationType: 'one_to_one' | 'one_to_many' | 'many_to_many';
}

export interface ErdDataDto {
  nodes: DbmlTableNodeDto[];
  relationships: DbmlRelationshipDto[];
  validationErrors: string[];
}

// Model types
export interface ModelListDto {
  id: string;
  name: string;
  description?: string;
  ownerEmail: string;
  databaseDialect: string;
  createdAt: string;
  updatedAt: string;
  yourRole: 'viewer' | 'editor' | 'owner' | 'admin' | 'developer' | 'domain_architect' | 'data_architect' | 'data_steward';
  latestVersion: number;
  modelGroupId?: string | null;
  modelGroupName?: string | null;
}

export interface ModelDetailDto {
  id: string;
  name: string;
  description?: string;
  ownerEmail: string;
  databaseDialect: string;
  createdAt: string;
  updatedAt: string;
  latestVersion: number;
  dbmlContent: string;
  erdData: ErdDataDto;
  yourRole: 'viewer' | 'editor' | 'owner' | 'admin' | 'developer' | 'domain_architect' | 'data_architect' | 'data_steward';
  modelGroupId?: string | null;
  modelGroupName?: string | null;
  projectMetadata?: Record<string, string>;
}

export interface ModelGroupDto {
  id?: string | null;
  name: string;
  modelCount: number;
}

export interface ModelVersionDto {
  id: string;
  versionNumber: number;
  createdBy: string;
  createdAt: string;
  changeSummary?: string;
}

export interface ModelVersionDetailDto {
  id: string;
  versionNumber: number;
  dbmlContent: string;
  createdBy: string;
  createdAt: string;
  changeSummary?: string;
  erdData: ErdDataDto;
}

export interface CreateModelRequestDto {
  name: string;
  description?: string;
  databaseDialect?: string;
  initialDbml?: string;
  projectMetadata?: Record<string, string>;
}

export interface UpdateModelRequestDto {
  name?: string;
  description?: string;
  databaseDialect?: string;
  dbmlContent?: string;
  changeSummary?: string;
  projectMetadata?: Record<string, string>;
}

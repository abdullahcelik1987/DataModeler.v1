/**
 * TypeScript type definitions for SQL migration and export functionality
 * Used by frontend components for type-safe migration management
 */

// Change Detection Types
export enum ChangeTypeEnum {
  Added = 'Added',
  Removed = 'Removed',
  Modified = 'Modified',
  Renamed = 'Renamed'
}

export interface TableChange {
  changeType: ChangeTypeEnum;
  tableName: string;
  propertyName?: string;
  oldValue?: string;
  newValue?: string;
  detectedAt: string;
}

export interface ColumnChange {
  changeType: ChangeTypeEnum;
  tableName: string;
  columnName: string;
  dataType?: string;
  propertyName?: string;
  oldValue?: string;
  newValue?: string;
  isNullable: boolean;
  isUnique: boolean;
  isPrimaryKey: boolean;
  detectedAt: string;
}

export interface RelationshipChange {
  changeType: ChangeTypeEnum;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationType: string;
  oldRelationType?: string;
  detectedAt: string;
}

export interface IndexChange {
  changeType: ChangeTypeEnum;
  tableName: string;
  indexName?: string;
  columns: string[];
  isUnique: boolean;
  detectedAt: string;
}

export interface EnumChange {
  changeType: ChangeTypeEnum;
  enumName: string;
  values: string[];
  modificationType?: string;
  detectedAt: string;
}

export interface ModelChangeDetectionResult {
  hasChanges: boolean;
  detectedAt: string;
  tableChanges: TableChange[];
  columnChanges: ColumnChange[];
  relationshipChanges: RelationshipChange[];
  indexChanges: IndexChange[];
  enumChanges: EnumChange[];
  constraintChanges: ConstraintChange[];
  totalChanges: number;
}

export interface ConstraintChange {
  changeType: ChangeTypeEnum;
  tableName: string;
  constraintName: string;
  constraintType: string;
  definition: string;
  detectedAt: string;
}

// SQL Migration Plan Types

export enum MigrationComplexity {
  Simple = 'Simple',
  Moderate = 'Moderate',
  Complex = 'Complex',
  VeryComplex = 'VeryComplex'
}

export enum MigrationRiskLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export enum IssueSeverity {
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error',
  Critical = 'Critical'
}

export enum IssueType {
  MissingDefault = 'MissingDefault',
  TypeChange = 'TypeChange',
  DataLoss = 'DataLoss',
  CircularDependency = 'CircularDependency',
  PerformanceImpact = 'PerformanceImpact'
}

export enum DataLossType {
  ColumnDropped = 'ColumnDropped',
  TableDropped = 'TableDropped',
  RequiredFieldAdded = 'RequiredFieldAdded',
  ConstraintViolation = 'ConstraintViolation'
}

export enum DataLossSeverity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export enum MigrationOperationType {
  CreateTable = 'CreateTable',
  DropTable = 'DropTable',
  AddColumn = 'AddColumn',
  DropColumn = 'DropColumn',
  AlterColumn = 'AlterColumn',
  CreateForeignKey = 'CreateForeignKey',
  DropForeignKey = 'DropForeignKey',
  CreateIndex = 'CreateIndex',
  DropIndex = 'DropIndex',
  CreateEnum = 'CreateEnum',
  DropEnum = 'DropEnum',
  AlterEnum = 'AlterEnum',
  CreateConstraint = 'CreateConstraint',
  DropConstraint = 'DropConstraint'
}

export interface MigrationOperation {
  operationType: MigrationOperationType;
  tableName?: string;
  columnName?: string;
  constraintName?: string;
  indexName?: string;
  dataType?: string;
  isNullable?: boolean;
  columns?: string[];
  isUnique?: boolean;
  referencedTable?: string;
  referencedColumn?: string;
  reversible: boolean;
  riskLevel: MigrationRiskLevel;
}

export interface MigrationStage {
  stageNumber: number;
  stageName: string;
  description: string;
  operations: MigrationOperation[];
  dependsOnStage?: number;
}

export interface ValidationIssue {
  severity: IssueSeverity;
  type: IssueType;
  message: string;
  affectedEntity?: string;
  recommendation?: string;
}

export interface DataLossWarning {
  warningType: DataLossType;
  severity: DataLossSeverity;
  tableName?: string;
  columnName?: string;
  message: string;
}

export interface SqlMigrationPlan {
  detectedAt: string;
  databaseDialect: string;
  complexity: MigrationComplexity;
  riskLevel: MigrationRiskLevel;
  estimatedDuration: string; // TimeSpan as ISO 8601 duration
  migrationStages: MigrationStage[];
  validationIssues: ValidationIssue[];
  dataLossWarnings: DataLossWarning[];
  summary: string;
  totalOperations: number;
}

// Optimized Plan Types

export enum ExecutionStrategy {
  Sequential = 'Sequential',
  Parallel = 'Parallel',
  Batched = 'Batched'
}

export interface DependencyGraphNode {
  operationId: number;
  stageNumber: number;
  operation: MigrationOperation;
  dependencies: number[];
  dependentOperations: number[];
  dependencyDepth: number;
}

export interface SafetyCheckpoint {
  beforeStage?: number;
  afterStage?: number;
  description: string;
  requiredAction: string;
  riskyOperations?: string[];
}

export interface ParallelGroup {
  groupIndex: number;
  operations: MigrationOperation[];
  canRunInParallel: boolean;
}

export interface ParallelizationGroup {
  stageNumber: number;
  groups: ParallelGroup[];
}

export interface CircularDependency {
  operationIds: number[];
  detectedAt: string;
  resolution: string;
}

export interface OptimizationMetrics {
  originalOperationCount: number;
  optimizedOperationCount: number;
  parallelizableGroups: number;
  estimatedTimeReduction: number;
  safetyCheckpointsAdded: number;
}

export interface OptimizedMigrationPlan {
  originalPlan: SqlMigrationPlan;
  optimizedAt: string;
  reorderedStages: MigrationStage[];
  dependencyGraph: DependencyGraphNode[];
  executionStrategy: ExecutionStrategy;
  safetyCheckpoints: SafetyCheckpoint[];
  parallelizationOpportunities: ParallelizationGroup[];
  circularDependencies: CircularDependency[];
  requiresConstraintDisable: boolean;
  isExecutionOrderValid: boolean;
  metrics: OptimizationMetrics;
}

// Export Script Types

export interface SqlExportRequest {
  modelId: string;
  databaseDialect: 'postgresql' | 'mysql' | 'sqlserver' | 'oracle';
  includeDropStatements: boolean;
  includeRollback: boolean;
  includeSafetyComments: boolean;
}

export interface SqlExportResult {
  modelId: string;
  databaseDialect: string;
  generatedAt: string;
  forwardScript: string;
  rollbackScript?: string;
  statistics: {
    tableCount: number;
    columnCount: number;
    indexCount: number;
    foreignKeyCount: number;
    lineCount: number;
  };
  estimatedExecutionTime: string;
}

// Migration History Types

export interface MigrationExecution {
  id: string;
  modelId: string;
  databaseDialect: string;
  executedAt: string;
  executedBy: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  affectedRows?: number;
  statementCount: number;
  rollbackAvailable: boolean;
}

export interface MigrationHistory {
  modelId: string;
  executions: MigrationExecution[];
  lastMigration?: MigrationExecution;
  totalMigrations: number;
  lastMigrationDate?: string;
}

// Request/Response DTOs

export interface DetectChangesRequest {
  oldDbmlContent: string;
  newDbmlContent: string;
}

export interface GenerateMigrationPlanRequest {
  changeDetection: ModelChangeDetectionResult;
  databaseDialect?: string;
}

export interface OptimizelMigrationPlanRequest {
  migrationPlan: SqlMigrationPlan;
}

export interface GenerateSqlScriptRequest {
  migrationPlan: SqlMigrationPlan;
  databaseDialect: string;
  includeRollback: boolean;
}

export interface ExportSqlRequest extends SqlExportRequest {
  oldDbmlContent?: string;
  newDbmlContent?: string;
}

export interface ExportSqlResponse {
  success: boolean;
  message: string;
  result?: SqlExportResult;
  plan?: SqlMigrationPlan;
  optimizedPlan?: OptimizedMigrationPlan;
}

// Component State Types

export interface MigrationPreviewState {
  isLoading: boolean;
  changeDetection?: ModelChangeDetectionResult;
  migrationPlan?: SqlMigrationPlan;
  optimizedPlan?: OptimizedMigrationPlan;
  selectedDialect: 'postgresql' | 'mysql' | 'sqlserver' | 'oracle';
  sqlScript?: string;
  rollbackScript?: string;
  error?: string;
  currentStep: 'initial' | 'detecting' | 'planning' | 'optimizing' | 'generating' | 'complete';
  statistics: {
    changesDetected: number;
    operationsCount: number;
    estimatedDuration: string;
    riskLevel: MigrationRiskLevel;
  };
}

export interface MigrationViewerState {
  focusedStage?: number;
  focusedOperation?: number;
  expandedOperations: Set<number>;
  showDetails: boolean;
  showRiskWarnings: boolean;
  showDataLossWarnings: boolean;
  selectedDialect: string;
  comparisonMode: boolean;
}

// Utility Types

export interface ChangeGroup {
  type: 'tables' | 'columns' | 'relationships' | 'indexes' | 'enums';
  count: number;
  items: any[];
}

export interface MigrationStatistics {
  totalTableChanges: number;
  totalColumnChanges: number;
  totalRelationshipChanges: number;
  totalIndexChanges: number;
  totalEnumChanges: number;
  totalOperations: number;
  estimatedExecutionTime: string;
  dataLossRisk: MigrationRiskLevel;
  requiresDowntime: boolean;
}

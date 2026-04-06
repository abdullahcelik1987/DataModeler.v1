/**
 * Analytics and Dashboard Type Definitions
 * Comprehensive TypeScript interfaces for admin dashboard functionality
 */

// =========================================================================
// Enums
// =========================================================================

export enum HealthStatus {
  Healthy = 'Healthy',
  Warning = 'Warning',
  Critical = 'Critical',
  Unknown = 'Unknown',
}

export enum MetricsPeriod {
  Hour = 'hour',
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Quarter = 'quarter',
  Year = 'year',
}

export enum SortBy {
  Usage = 'usage',
  Size = 'size',
  Modified = 'modified',
  Created = 'created',
  AccessCount = 'accessCount',
}

export enum ChartType {
  LineChart = 'line',
  BarChart = 'bar',
  PieChart = 'pie',
  AreaChart = 'area',
  HeatMap = 'heatmap',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  Excel = 'xlsx',
}

// =========================================================================
// Dashboard Overview
// =========================================================================

export interface DashboardOverview {
  generatedAt: Date;
  totalModels: number;
  totalUsers: number;
  totalVersions: number;
  totalBranches: number;
  activeUsersToday: number;
  modelsCreatedToday: number;
  versionsCreatedToday: number;
  averageModelSize: number; // in MB
  systemUptime: string; // formatted duration
  lastBackupTime: Date;
  databaseStatus: HealthStatus;
  storageUsedPercentage: number;
  quickStats: QuickStat[];
}

export interface QuickStat {
  label: string;
  value: string | number;
  change: number; // percentage change from previous period
  trend: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
}

// =========================================================================
// System Health
// =========================================================================

export interface SystemHealth {
  checkedAt: Date;
  status: HealthStatus;
  components: ComponentHealth[];
  healthScore: number; // 0-100
  alerts: Alert[];
  warnings: Warning[];
  overallStatus: 'operational' | 'degraded' | 'down';
}

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  responseTime?: number; // in milliseconds
  lastChecked: Date;
  uptime?: number; // percentage
  dependencies?: string[];
  details?: Record<string, any>;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  message: string;
  timestamp: Date;
  component: string;
  action?: string;
}

export interface Warning {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

// =========================================================================
// Model Analytics
// =========================================================================

export interface ModelAnalytics {
  modelId: string;
  name: string;
  owner: string;
  createdAt: Date;
  lastModified: Date;
  versionCount: number;
  branchCount: number;
  tableCount: number;
  accessCount: number;
  collaboratorCount: number;
  averageAccessFrequency: number; // sessions per day
  sizeInBytes: number;
  complexity: 'simple' | 'medium' | 'complex';
  trend?: GrowthMetrics;
}

export interface GrowthMetrics {
  accessGrowth: number; // percentage change
  versionGrowth: number;
  collaboratorGrowth: number;
  period: MetricsPeriod;
}

export interface TopModelsRequest {
  count?: number;
  sortBy?: SortBy;
  period?: MetricsPeriod;
}

// =========================================================================
// User Activity
// =========================================================================

export interface UserActivityMetrics {
  periodStart: Date;
  periodEnd: Date;
  totalActiveUsers: number;
  newUsersCount: number;
  dailyActiveUsers: DailyActiveUser[];
  topActiveUsers: UserActivity[];
  loginCount: number;
  sessionDuration: string; // formatted duration
  userEngagementScore: number; // 0-100
  retentionRate: number; // percentage
  churnRate: number; // percentage
  activityHeatmap: HeatmapData[];
}

export interface DailyActiveUser {
  date: Date;
  count: number;
  newUsers?: number;
  returningUsers?: number;
}

export interface UserActivity {
  userId: string;
  username: string;
  email?: string;
  accessCount: number;
  lastAccess: Date;
  averageSessionDuration?: string;
  features?: string[];
}

export interface HeatmapData {
  day: string; // 'Monday', 'Tuesday', etc
  hour: string; // '09:00', '10:00', etc
  count: number;
  intensity: number; // 0-100
}

// =========================================================================
// Model Statistics
// =========================================================================

export interface ModelStatistics {
  calculatedAt: Date;
  totalModels: number;
  publicModels: number;
  privateModels: number;
  sharedModels: number;
  averageTablesPerModel: number;
  averageColumnsPerModel: number;
  averageRelationshipsPerModel: number;
  largestModel: string;
  smallestModel: string;
  modelGrowthTrend: GrowthTrend[];
  complexityDistribution: Record<string, number>;
  databaseTypeDistribution: Record<string, number>;
  accessPatterns?: AccessPattern[];
}

export interface GrowthTrend {
  month: number;
  count: number;
  newModels?: number;
  deletedModels?: number;
}

export interface AccessPattern {
  time: Date;
  accessCount: number;
  uniqueUsers: number;
}

// =========================================================================
// Performance Metrics
// =========================================================================

export interface PerformanceMetrics {
  measuredAt: Date;
  averageResponseTime: number; // milliseconds
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number; // percentage
  upstreamLatency: number;
  cacheHitRate: number; // percentage
  databaseQueryTime: number;
  throughputByEndpoint: EndpointThroughput[];
  slowQueries: SlowQuery[];
  memoryUsage: number; // percentage
  cpuUsage: number; // percentage
  diskIOUsage?: number; // percentage
  networkBandwidth?: {
    inbound: number;
    outbound: number;
  };
}

export interface EndpointThroughput {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestsPerSecond: number;
  averageLatency: number;
  errorCount: number;
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  count: number;
  lastExecuted: Date;
}

// =========================================================================
// Audit & Compliance
// =========================================================================

export interface AuditSummary {
  periodStart: Date;
  periodEnd: Date;
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByUser: Record<string, number>;
  failedOperations: number;
  securityEvents: number;
  dataModifications: number;
  loginAttempts: number;
  failedLogins: number;
  unauthorizedAccesses: number;
  highRiskEvents: HighRiskEvent[];
}

export interface HighRiskEvent {
  id: string;
  eventType: string;
  description: string;
  timestamp: Date;
  userId: string;
  severity: 'critical' | 'high' | 'medium';
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, { old: any; new: any }>;
  status: 'success' | 'failure';
  errorMessage?: string;
  ipAddress?: string;
}

// =========================================================================
// Storage Analytics
// =========================================================================

export interface StorageAnalytics {
  analyzedAt: Date;
  totalStorageUsed: number; // bytes
  totalStorageQuota: number; // bytes
  usagePercentage: number;
  modelStorageBreakdown: StorageBreakdown;
  versionStorageUsage: StorageBreakdown;
  backupStorageUsage: StorageBreakdown;
  largestModels: ModelStorage[];
  storageTrend: StorageTrend[];
  estimatedCostPerMonth: number;
  projectedFullAt?: Date;
}

export interface StorageBreakdown {
  total: number; // bytes
  percentageOfTotal: number;
  itemCount: number;
}

export interface ModelStorage {
  modelName: string;
  sizeInBytes: number;
  sizeInMB: number; // calculated
  lastModified: Date;
  owner: string;
  versionCount: number;
}

export interface StorageTrend {
  date: Date;
  usageInBytes: number;
  growthRate: number; // percentage
}

// =========================================================================
// Access Patterns
// =========================================================================

export interface AccessPattern {
  analyzedDate: Date;
  daysAnalyzed: number;
  peakHours: string[];
  peakDays: string[];
  accessByTimeOfDay: Record<string, number>;
  accessByDayOfWeek: Record<string, number>;
  geographicDistribution: Record<string, number>;
  deviceDistribution: Record<string, number>;
  browserDistribution: Record<string, number>;
  mostUsedFeatures: FeatureUsage[];
  leastUsedFeatures: FeatureUsage[];
}

export interface FeatureUsage {
  feature: string;
  usageCount: number;
  percentageOfTotal: number;
  lastUsed: Date;
  uniqueUsers: number;
}

// =========================================================================
// Reports
// =========================================================================

export interface Report {
  id: string;
  title: string;
  type: 'health' | 'performance' | 'usage' | 'security' | 'custom';
  format: ReportFormat;
  generatedAt: Date;
  generatedBy: string;
  periodStart: Date;
  periodEnd: Date;
  sections: ReportSection[];
  summary: string;
  recommendations: string[];
}

export interface ReportSection {
  title: string;
  content: string;
  dataViz?: ChartData;
  findings: string[];
}

export interface ChartData {
  type: ChartType;
  labels: string[];
  datasets: ChartDataset[];
  options?: Record<string, any>;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  fill?: boolean;
}

export interface ReportGenerationRequest {
  type: 'health' | 'performance' | 'usage' | 'security' | 'custom';
  format: ReportFormat;
  periodStart: Date;
  periodEnd: Date;
  sections?: string[];
  includeRecommendations?: boolean;
}

// =========================================================================
// Dashboard State & Configuration
// =========================================================================

export interface AdminDashboardState {
  overview: DashboardOverview | null;
  systemHealth: SystemHealth | null;
  topModels: ModelAnalytics[];
  userActivity: UserActivityMetrics | null;
  modelStats: ModelStatistics | null;
  performance: PerformanceMetrics | null;
  auditSummary: AuditSummary | null;
  storage: StorageAnalytics | null;
  accessPatterns: AccessPattern | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  refreshInterval: number; // milliseconds
}

export interface AdminDashboardConfig {
  defaultPeriod: MetricsPeriod;
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds
  chartResolution: 'low' | 'medium' | 'high';
  enableRealTimeUpdates: boolean;
  alertThresholds: AlertThresholds;
  visibleSections: DashboardSection[];
  darkMode: boolean;
}

export interface AlertThresholds {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  errorRatePercent: number;
  responseTimeMs: number;
  storageUsagePercent: number;
  failedLoginAttempts: number;
}

export enum DashboardSection {
  Overview = 'overview',
  SystemHealth = 'systemHealth',
  TopModels = 'topModels',
  UserActivity = 'userActivity',
  ModelStatistics = 'modelStatistics',
  Performance = 'performance',
  Audit = 'audit',
  Storage = 'storage',
  AccessPatterns = 'accessPatterns',
}

// =========================================================================
// API Request/Response Types
// =========================================================================

export interface GetDashboardRequest {
  period?: MetricsPeriod;
  includeDetails?: boolean;
}

export interface GetMetricsRequest {
  startDate: Date;
  endDate: Date;
  granularity?: 'hour' | 'day' | 'week';
  metrics?: string[];
}

export interface GetReportRequest {
  type: 'health' | 'performance' | 'usage' | 'security' | 'custom';
  format: ReportFormat;
  periodStart: Date;
  periodEnd: Date;
  includeCharts?: boolean;
}

export interface ExportDataRequest {
  format: 'csv' | 'json' | 'excel';
  dataType: string;
  periodStart: Date;
  periodEnd: Date;
}

// =========================================================================
// Notification & Alert Types
// =========================================================================

export interface DashboardNotification {
  id: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  dismissible: boolean;
}

export interface MetricAlert {
  id: string;
  metricName: string;
  threshold: number;
  operator: '<' | '>' | '=' | '<=' | '>=';
  currentValue: number;
  triggered: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  lastTriggered?: Date;
}

// =========================================================================
// Utility Interfaces
// =========================================================================

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardError extends Error {
  code: string;
  statusCode: number;
  context?: Record<string, any>;
}


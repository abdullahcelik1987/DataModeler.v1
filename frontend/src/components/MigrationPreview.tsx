'use client';

import React, { useState } from 'react';
import {
  Copy,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Github,
  Zap,
} from 'lucide-react';
import {
  ModelChangeDetectionResult,
  SqlMigrationPlan,
  OptimizedMigrationPlan,
  MigrationRiskLevel,
  MigrationComplexity,
  ChangeTypeEnum,
  MigrationOperationType,
  IssueSeverity,
} from '@/src/types/migration';
import {
  useMigration,
  UseMigrationReturn,
} from '@/src/hooks/useMigration';

interface MigrationPreviewProps {
  modelId?: string;
  oldDbmlContent?: string;
  newDbmlContent?: string;
  onExportComplete?: (sql: string) => void;
}

export function MigrationPreview({
  modelId,
  oldDbmlContent,
  newDbmlContent,
  onExportComplete,
}: MigrationPreviewProps) {
  const migration = useMigration({ apiUrl: process.env.NEXT_PUBLIC_API_URL, modelId });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sqlFormat, setSqlFormat] = useState<'formatted' | 'compact'>('formatted');

  const handleDetectChanges = async () => {
    if (!oldDbmlContent || !newDbmlContent) {
      alert('Please provide both old and new DBML content');
      return;
    }

    const result = await migration.detectChanges(oldDbmlContent, newDbmlContent);
    if (result && result.hasChanges) {
      // Auto-generate plan after detecting changes
      const plan = await migration.generateMigrationPlan(result);
      if (plan) {
        await migration.optimizeMigrationPlan(plan);
      }
    }
  };

  const handleExportSql = async () => {
    if (!migration.migrationPlan) return;

    const result = await migration.generateSqlScript(migration.migrationPlan);
    if (result) {
      onExportComplete?.(result.forwardScript);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">SQL Migration Builder</h2>
          <p className="text-slate-600 mt-1">
            Generate migration scripts from DBML changes
          </p>
        </div>
        <Database className="w-8 h-8 text-blue-600" />
      </div>

      {/* Database Dialect Selection */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Target Database
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['postgresql', 'mysql', 'sqlserver', 'oracle'] as const).map(
            (dialect) => (
              <button
                key={dialect}
                onClick={() => migration.selectDialect(dialect)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  migration.selectedDialect === dialect
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {dialect === 'postgresql'
                  ? 'PostgreSQL'
                  : dialect === 'mysql'
                  ? 'MySQL'
                  : dialect === 'sqlserver'
                  ? 'SQL Server'
                  : 'Oracle'}
              </button>
            )
          )}
        </div>
      </div>

      {/* Current Step Indicator */}
      <StepIndicator currentStep={migration.currentStep} isLoading={migration.isLoading} />

      {/* Statistics */}
      {migration.changeDetection && (
        <StatisticsCard statistics={migration.statistics} migration={migration} />
      )}

      {/* Changes Summary */}
      {migration.changeDetection && (
        <ChangesSummary changes={migration.changeDetection} />
      )}

      {/* Migration Plan */}
      {migration.migrationPlan && (
        <MigrationPlanView
          plan={migration.migrationPlan}
          optimizedPlan={migration.optimizedPlan}
        />
      )}

      {/* Validation Issues */}
      {migration.migrationPlan?.validationIssues &&
        migration.migrationPlan.validationIssues.length > 0 && (
        <ValidationIssuesPanel issues={migration.migrationPlan.validationIssues} />
      )}

      {/* Data Loss Warnings */}
      {migration.migrationPlan?.dataLossWarnings &&
        migration.migrationPlan.dataLossWarnings.length > 0 && (
        <DataLossWarningsPanel warnings={migration.migrationPlan.dataLossWarnings} />
      )}

      {/* SQL Script Display */}
      {migration.sqlScript && (
        <SqlScriptViewer
          script={migration.sqlScript}
          rollbackScript={migration.rollbackScript}
          onCopy={migration.copySqlToClipboard}
          onDownload={migration.downloadSqlScript}
          format={sqlFormat}
          onFormatChange={setSqlFormat}
        />
      )}

      {/* Error Display */}
      {migration.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{migration.error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>

        {!migration.sqlScript ? (
          <button
            onClick={handleDetectChanges}
            disabled={migration.isLoading || !oldDbmlContent || !newDbmlContent}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {migration.isLoading ? 'Processing...' : 'Generate Migration'}
          </button>
        ) : (
          <>
            <button
              onClick={migration.copySqlToClipboard}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              onClick={migration.downloadSqlScript}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => migration.reset()}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  currentStep: string;
  isLoading: boolean;
}

function StepIndicator({ currentStep, isLoading }: StepIndicatorProps) {
  const steps = ['detecting', 'planning', 'optimizing', 'generating', 'complete'];
  const currentIndex = steps.indexOf(currentStep as any);

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        {['Detect Changes', 'Generate Plan', 'Optimize', 'Generate SQL', 'Complete'].map(
          (label, idx) => (
            <div key={label} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx < currentIndex
                    ? 'bg-green-500 text-white'
                    : idx === currentIndex
                    ? 'bg-blue-600 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {idx < currentIndex ? '✓' : idx + 1}
              </div>
              <label className="text-xs text-slate-600 mt-2 text-center">{label}</label>
            </div>
          )
        )}
      </div>
    </div>
  );
}

interface StatisticsCardProps {
  statistics: any;
  migration: UseMigrationReturn;
}

function StatisticsCard({ statistics, migration }: StatisticsCardProps) {
  const getRiskColor = (risk: MigrationRiskLevel) => {
    switch (risk) {
      case MigrationRiskLevel.Low:
        return 'text-green-600 bg-green-50';
      case MigrationRiskLevel.Medium:
        return 'text-yellow-600 bg-yellow-50';
      case MigrationRiskLevel.High:
        return 'text-orange-600 bg-orange-50';
      case MigrationRiskLevel.Critical:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        icon={<Zap className="w-5 h-5" />}
        label="Changes Detected"
        value={statistics.changesDetected}
        color="blue"
      />
      <StatCard
        icon={<Database className="w-5 h-5" />}
        label="Operations"
        value={statistics.operationsCount}
        color="purple"
      />
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        label="Est. Duration"
        value={statistics.estimatedDuration}
        color="indigo"
      />
      <div className={`rounded-lg p-4 ${getRiskColor(statistics.riskLevel)}`}>
        <AlertTriangle className="w-5 h-5 mb-2" />
        <p className="text-xs font-medium">Risk Level</p>
        <p className="text-lg font-bold">{statistics.riskLevel}</p>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
  }[color] || 'bg-slate-50 text-slate-600';

  return (
    <div className={`rounded-lg p-4 ${colorClasses}`}>
      {icon}
      <p className="text-xs font-medium mt-2">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

interface ChangesSummaryProps {
  changes: ModelChangeDetectionResult;
}

function ChangesSummary({ changes }: ChangesSummaryProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h3 className="font-bold text-slate-900 mb-3">Changes Summary</h3>
      <div className="grid grid-cols-5 gap-3">
        {changes.tableChanges.length > 0 && (
          <ChangeItem label="Tables" count={changes.tableChanges.length} color="blue" />
        )}
        {changes.columnChanges.length > 0 && (
          <ChangeItem label="Columns" count={changes.columnChanges.length} color="purple" />
        )}
        {changes.relationshipChanges.length > 0 && (
          <ChangeItem
            label="Relationships"
            count={changes.relationshipChanges.length}
            color="pink"
          />
        )}
        {changes.indexChanges.length > 0 && (
          <ChangeItem label="Indexes" count={changes.indexChanges.length} color="indigo" />
        )}
        {changes.enumChanges.length > 0 && (
          <ChangeItem label="Enums" count={changes.enumChanges.length} color="green" />
        )}
      </div>
    </div>
  );
}

interface ChangeItemProps {
  label: string;
  count: number;
  color: string;
}

function ChangeItem({ label, count, color }: ChangeItemProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    pink: 'bg-pink-100 text-pink-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    green: 'bg-green-100 text-green-700',
  }[color] || 'bg-slate-100 text-slate-700';

  return (
    <div className={`rounded-lg p-3 text-center ${colorClasses}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}

interface MigrationPlanViewProps {
  plan: SqlMigrationPlan;
  optimizedPlan?: OptimizedMigrationPlan;
}

function MigrationPlanView({ plan, optimizedPlan }: MigrationPlanViewProps) {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4">
        <h3 className="font-bold">Migration Plan</h3>
        <p className="text-sm text-slate-300">{plan.migrationStages.length} stages</p>
      </div>

      <div className="divide-y">
        {plan.migrationStages.map((stage) => (
          <div key={stage.stageNumber} className="border-l-4 border-blue-500">
            <button
              onClick={() =>
                setExpandedStage(
                  expandedStage === stage.stageNumber ? null : stage.stageNumber
                )
              }
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-slate-900">
                  Stage {stage.stageNumber}: {stage.stageName}
                </h4>
                <p className="text-xs text-slate-500">{stage.operations.length} operations</p>
              </div>
              <span className="text-slate-400">
                {expandedStage === stage.stageNumber ? '−' : '+'}
              </span>
            </button>

            {expandedStage === stage.stageNumber && (
              <div className="bg-slate-50 px-4 py-3 space-y-2">
                {stage.operations.map((op, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded p-2 text-xs border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {op.operationType}
                      </span>
                      <span className="text-slate-600">
                        {op.tableName}
                        {op.columnName && `.${op.columnName}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ValidationIssuesPanelProps {
  issues: any[];
}

function ValidationIssuesPanel({ issues }: ValidationIssuesPanelProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-yellow-900">Validation Issues</h4>
          <ul className="mt-2 space-y-1">
            {issues.map((issue, idx) => (
              <li key={idx} className="text-sm text-yellow-800">
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface DataLossWarningsPanelProps {
  warnings: any[];
}

function DataLossWarningsPanel({ warnings }: DataLossWarningsPanelProps) {
  const criticalWarnings = warnings.filter((w) => w.severity === 'Critical');

  if (criticalWarnings.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-900">Data Loss Warnings</h4>
          <ul className="mt-2 space-y-1">
            {criticalWarnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-red-800">
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface SqlScriptViewerProps {
  script: string;
  rollbackScript?: string;
  onCopy: () => Promise<boolean>;
  onDownload: () => void;
  format: 'formatted' | 'compact';
  onFormatChange: (format: 'formatted' | 'compact') => void;
}

function SqlScriptViewer({
  script,
  rollbackScript,
  onCopy,
  onDownload,
  format,
  onFormatChange,
}: SqlScriptViewerProps) {
  const [showRollback, setShowRollback] = useState(false);
  const displayScript = showRollback ? rollbackScript : script;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold">Generated SQL Script</h3>
          <p className="text-sm text-slate-300">
            {displayScript?.split('\n').length || 0} lines
          </p>
        </div>
        <div className="flex gap-2">
          {rollbackScript && (
            <button
              onClick={() => setShowRollback(!showRollback)}
              className="px-3 py-1 rounded text-sm bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              {showRollback ? 'Migration' : 'Rollback'}
            </button>
          )}
          <button
            onClick={onCopy}
            className="px-3 py-1 rounded text-sm bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Copy
          </button>
          <button
            onClick={onDownload}
            className="px-3 py-1 rounded text-sm bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-700 bg-slate-50">
        {displayScript}
      </pre>
    </div>
  );
}

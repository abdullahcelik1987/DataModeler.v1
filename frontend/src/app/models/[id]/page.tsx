'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { DbmlEditor } from '@/src/components/DbmlEditor';
import { ErDiagram } from '@/src/components/ErDiagram';
import { ModelDetailDto, ErdDataDto, DbmlColumnDto } from '@/src/types/dbml';
import {
  DbmlProjectMetadata,
  ProjectEnvironment,
  createDefaultProjectMetadata,
  getTodayIsoDate,
  parseProjectMetadata,
  upsertProjectBlock,
} from '@/src/lib/dbmlProjectMetadata';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const RELATION_SYMBOL: Record<string, string> = {
  one_to_one: '-',
  one_to_many: '>',
  many_to_many: '<>',
};

type EditableColumn = DbmlColumnDto & {
  isForeignKey: boolean;
  referenceTable?: string;
  referenceColumn?: string;
  relationType?: 'one_to_one' | 'one_to_many' | 'many_to_many';
};

function generateDbmlFromErd(erdData: ErdDataDto): string {
  const tableBlocks = erdData.nodes.map((table) => {
    const columnLines = table.columns.map((column) => {
      const settings: string[] = [];
      if (column.isPrimaryKey) settings.push('pk');
      if (column.isNotNull) settings.push('not null');
      if (column.isUnique) settings.push('unique');
      if (column.isAutoIncrement) settings.push('increment');
      if (column.defaultValue && column.defaultValue.trim().length > 0) {
        settings.push(`default: ${column.defaultValue}`);
      }
      if (column.note && column.note.trim().length > 0) {
        settings.push(`note: '${column.note.replace(/'/g, "\\'")}'`);
      }

      const settingsText = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
      return `  ${column.columnName} ${column.columnType}${settingsText}`;
    });

    return [`Table ${table.tableName} {`, ...columnLines, '}'].join('\n');
  });

  const relationLines = erdData.relationships.map((relationship) => {
    const relationSymbol = RELATION_SYMBOL[relationship.relationType] || '>';
    return `Ref: ${relationship.fromTable}.${relationship.fromColumn} ${relationSymbol} ${relationship.toTable}.${relationship.toColumn}`;
  });

  return [...tableBlocks, ...relationLines].join('\n\n').trim();
}

export default function ModelEditorPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;

  const [model, setModel] = useState<ModelDetailDto | null>(null);
  const [dbmlContent, setDbmlContent] = useState<string>('');
  const [erdData, setErdData] = useState<ErdDataDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'diagram'>('editor');
  const [changeSummary, setChangeSummary] = useState('');
  const [editingTableName, setEditingTableName] = useState<string | null>(null);
  const [editingColumns, setEditingColumns] = useState<EditableColumn[]>([]);
  const [isDiagramFullscreen, setIsDiagramFullscreen] = useState(false);
  const [dbmlSearchText, setDbmlSearchText] = useState('');
  const [dbmlSearchNonce, setDbmlSearchNonce] = useState(0);
  const [diagramSearchText, setDiagramSearchText] = useState('');
  const [diagramFocusTableName, setDiagramFocusTableName] = useState<string | undefined>(undefined);
  const [diagramFocusNonce, setDiagramFocusNonce] = useState(0);
  const [projectMetadata, setProjectMetadata] = useState<DbmlProjectMetadata>(createDefaultProjectMetadata());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchModel();
  }, [isAuthenticated, modelId]);

  const fetchModel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/${modelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load model');

      const data = await response.json();
      setModel(data);
      setDbmlContent(data.dbmlContent);
      setErdData(data.erdData);

      const parsedProject = parseProjectMetadata(data.dbmlContent);
      setProjectMetadata(createDefaultProjectMetadata({
        databaseType: data.databaseDialect || parsedProject.metadata.databaseType,
        owner: parsedProject.metadata.owner || user?.email || '',
        description: parsedProject.metadata.description,
        version: parsedProject.metadata.version,
        lastUpdate: parsedProject.metadata.lastUpdate || getTodayIsoDate(),
        environment: parsedProject.metadata.environment,
        contact: parsedProject.metadata.contact,
        businessDomain: parsedProject.metadata.businessDomain,
      }));

      setLoading(false);
    } catch (err) {
      setError('Failed to load model');
      setLoading(false);
    }
  };

  const parseDbmlToErd = async (content: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/parse-dbml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbmlContent: content })
      });

      const parsed = await response.json();
      setErdData(parsed);
    } catch (err) {
      // Keep last valid ER diagram on parse errors.
    }
  };

  const handleDbmlChange = async (newContent: string) => {
    setDbmlContent(newContent);

    const parsedProject = parseProjectMetadata(newContent);
    if (parsedProject.hasProjectBlock) {
      setProjectMetadata((current) => ({
        ...current,
        ...parsedProject.metadata,
      }));
    }

    await parseDbmlToErd(newContent);
  };

  const handleProjectMetadataChange = (field: keyof DbmlProjectMetadata, value: string) => {
    setProjectMetadata((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleOpenTableEditor = (tableName: string) => {
    if (!isEditor || !erdData) return;

    const targetTable = erdData.nodes.find((node) => node.tableName === tableName);
    if (!targetTable) return;

    const columnsWithRelationshipInfo: EditableColumn[] = targetTable.columns.map((column) => {
      const outgoingRelationship = erdData.relationships.find(
        (relationship) => relationship.fromTable === tableName && relationship.fromColumn === column.columnName
      );

      return {
        ...column,
        isForeignKey: !!outgoingRelationship,
        referenceTable: outgoingRelationship?.toTable,
        referenceColumn: outgoingRelationship?.toColumn,
        relationType: outgoingRelationship?.relationType || 'one_to_many',
      };
    });

    setEditingTableName(tableName);
    setEditingColumns(columnsWithRelationshipInfo);
  };

  const handleColumnChange = (index: number, field: keyof EditableColumn, value: string | boolean) => {
    setEditingColumns((currentColumns) =>
      currentColumns.map((column, columnIndex) =>
        columnIndex === index ? { ...column, [field]: value } : column
      )
    );
  };

  const handleAddColumn = () => {
    setEditingColumns((currentColumns) => [
      ...currentColumns,
      {
        columnName: 'new_column',
        columnType: 'varchar(255)',
        isPrimaryKey: false,
        isUnique: false,
        isNotNull: false,
        isAutoIncrement: false,
        isForeignKey: false,
        relationType: 'one_to_many',
      }
    ]);
  };

  const handleRemoveColumn = (index: number) => {
    setEditingColumns((currentColumns) => currentColumns.filter((_, columnIndex) => columnIndex !== index));
  };

  const handleSaveTableChanges = async () => {
    if (!erdData || !editingTableName) return;

    const normalizedColumns: DbmlColumnDto[] = editingColumns
      .filter((column) => column.columnName.trim().length > 0 && column.columnType.trim().length > 0)
      .map((column) => ({
        columnName: column.columnName.trim(),
        columnType: column.columnType.trim(),
        isPrimaryKey: column.isPrimaryKey,
        isUnique: column.isUnique,
        isNotNull: column.isNotNull,
        isAutoIncrement: column.isAutoIncrement,
        defaultValue: column.defaultValue?.trim() || undefined,
        note: column.note,
      }));

    const newForeignKeyRelationships = editingColumns
      .filter(
        (column) =>
          column.isForeignKey &&
          column.columnName.trim().length > 0 &&
          !!column.referenceTable &&
          !!column.referenceColumn
      )
      .map((column) => ({
        fromTable: editingTableName,
        fromColumn: column.columnName.trim(),
        toTable: column.referenceTable as string,
        toColumn: column.referenceColumn as string,
        relationType: (column.relationType || 'one_to_many') as 'one_to_one' | 'one_to_many' | 'many_to_many',
      }));

    const remainingRelationships = erdData.relationships.filter(
      (relationship) => relationship.fromTable !== editingTableName
    );

    const updatedErdData: ErdDataDto = {
      ...erdData,
      nodes: erdData.nodes.map((node) =>
        node.tableName === editingTableName
          ? {
              ...node,
              columns: normalizedColumns,
            }
          : node
      ),
      relationships: [...remainingRelationships, ...newForeignKeyRelationships]
    };

    const nextDbml = generateDbmlFromErd(updatedErdData);
    setErdData(updatedErdData);
    setDbmlContent(nextDbml);
    await parseDbmlToErd(nextDbml);

    setEditingTableName(null);
    setEditingColumns([]);
    setStatusMessage('Entity updated. Remember to save model changes.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveModel = async () => {
    if (!model) return;

    setSaving(true);
    setError(null);

    try {
      const metadataToSave: DbmlProjectMetadata = {
        ...projectMetadata,
        databaseType: projectMetadata.databaseType || model.databaseDialect || 'PostgreSQL',
        owner: projectMetadata.owner || user?.email || '',
        version: projectMetadata.version || '1.0.0',
        lastUpdate: getTodayIsoDate(),
      };
      const dbmlWithMetadata = upsertProjectBlock(dbmlContent, model.name, metadataToSave);

      setProjectMetadata(metadataToSave);
      setDbmlContent(dbmlWithMetadata);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/${modelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: model.name,
          description: model.description,
          databaseDialect: metadataToSave.databaseType,
          dbmlContent: dbmlWithMetadata,
          changeSummary: changeSummary || 'Updated model'
        })
      });

      if (!response.ok) throw new Error('Failed to save model');

      const updated = await response.json();
      setModel(updated);
      setDbmlContent(updated.dbmlContent);
      setErdData(updated.erdData);
      setChangeSummary('');
      setStatusMessage('Model saved successfully');

      // Show success message
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setError('Failed to save model');
    } finally {
      setSaving(false);
    }
  };

  const handleDbmlSearch = () => {
    if (!dbmlSearchText.trim()) return;
    setDbmlSearchNonce((current) => current + 1);
  };

  const handleDiagramSearch = () => {
    const query = diagramSearchText.trim().toLocaleLowerCase();
    if (!query || !erdData) return;

    const matchedTable = erdData.nodes.find((node) => node.tableName.toLocaleLowerCase().includes(query));
    if (!matchedTable) {
      setStatusMessage('Entity not found in this model.');
      setTimeout(() => setStatusMessage(null), 2500);
      return;
    }

    setDiagramFocusTableName(matchedTable.tableName);
    setDiagramFocusNonce((current) => current + 1);
    setStatusMessage(`Focused entity: ${matchedTable.tableName}`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!model) {
    return <div className="flex items-center justify-center min-h-screen">Model not found</div>;
  }

  const isEditor = model.yourRole === 'editor' || model.yourRole === 'owner';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Model Editor</p>
              <h1 className="text-2xl font-bold text-slate-900">{model.name}</h1>
              <p className="text-sm text-slate-600">Version {model.latestVersion} • {model.databaseDialect}</p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Role: {model.yourRole}</span>
              <button
                onClick={() => router.push('/models')}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
              >
                Back to Models
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
              {statusMessage}
            </div>
          )}
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-lg border border-slate-300 p-1 bg-slate-100">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                  activeTab === 'editor'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DBML Editor
              </button>
              <button
                onClick={() => setActiveTab('diagram')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                  activeTab === 'diagram'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ERD Diagram
              </button>
            </div>

            {isEditor && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  placeholder="Change summary..."
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSaveModel}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 transition"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {!isEditor && (
            <p className="mt-3 text-sm text-slate-500">
              You have read-only access to this model.
            </p>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Project Metadata</h3>
              <p className="text-xs text-slate-500">Stored inside DBML Project block and synced on save.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Database Type</label>
                <select
                  value={projectMetadata.databaseType}
                  onChange={(e) => handleProjectMetadataChange('databaseType', e.target.value)}
                  disabled={!isEditor}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MySQL">MySQL</option>
                  <option value="SQL Server">SQL Server</option>
                  <option value="Oracle">Oracle</option>
                  <option value="SQLite">SQLite</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Environment</label>
                <select
                  value={projectMetadata.environment}
                  onChange={(e) => handleProjectMetadataChange('environment', e.target.value as ProjectEnvironment)}
                  disabled={!isEditor}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="Development">Development</option>
                  <option value="Test">Test</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Owner</label>
                <input
                  type="text"
                  value={projectMetadata.owner}
                  onChange={(e) => handleProjectMetadataChange('owner', e.target.value)}
                  disabled={!isEditor}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Version</label>
                <input
                  type="text"
                  value={projectMetadata.version}
                  onChange={(e) => handleProjectMetadataChange('version', e.target.value)}
                  disabled={!isEditor}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Contact</label>
                <input
                  type="email"
                  value={projectMetadata.contact}
                  onChange={(e) => handleProjectMetadataChange('contact', e.target.value)}
                  disabled={!isEditor}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Business Domain</label>
                <input
                  type="text"
                  value={projectMetadata.businessDomain}
                  onChange={(e) => handleProjectMetadataChange('businessDomain', e.target.value)}
                  disabled={!isEditor}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Last Update</label>
                <input
                  type="text"
                  value={projectMetadata.lastUpdate}
                  disabled
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">Project Description</label>
              <textarea
                value={projectMetadata.description}
                onChange={(e) => handleProjectMetadataChange('description', e.target.value)}
                disabled={!isEditor}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-6">
        {activeTab === 'editor' && (
          <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">DBML Editor</h2>
                <p className="text-sm text-slate-500 mt-1">Edit schema text with the same canvas footprint as the ER Diagram.</p>
              </div>
              <div className="flex w-full max-w-xl items-center gap-2">
                <input
                  type="text"
                  value={dbmlSearchText}
                  onChange={(e) => setDbmlSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDbmlSearch();
                  }}
                  placeholder="Search entity in DBML text..."
                  className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={handleDbmlSearch}
                  className="h-10 rounded-lg border border-cyan-600 bg-cyan-600 px-4 text-sm font-medium text-white transition hover:bg-cyan-700"
                >
                  Search
                </button>
              </div>
            </div>
            <DbmlEditor
              value={dbmlContent}
              onChange={handleDbmlChange}
              readOnly={!isEditor}
              height="78vh"
              searchQuery={dbmlSearchText}
              searchNonce={dbmlSearchNonce}
            />

            {erdData?.validationErrors && erdData.validationErrors.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Parsing Errors:</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  {erdData.validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diagram' && (
          <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Entity Relationship Diagram</h2>
                <p className="text-sm text-slate-500 mt-1">Use scroll for dense entities or resize cards only when you need more room.</p>
              </div>
              <div className="flex w-full max-w-3xl items-center gap-2 self-start lg:self-auto">
                <input
                  type="text"
                  value={diagramSearchText}
                  onChange={(e) => setDiagramSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDiagramSearch();
                  }}
                  placeholder="Search entity in diagram..."
                  className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  onClick={handleDiagramSearch}
                  className="h-10 rounded-lg border border-cyan-600 bg-cyan-600 px-4 text-sm font-medium text-white transition hover:bg-cyan-700"
                >
                  Focus
                </button>
                <button
                  onClick={() => setIsDiagramFullscreen(true)}
                  className="h-10 rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  Full Screen
                </button>
              </div>
            </div>

            {erdData && (
              <ErDiagram
                tables={erdData.nodes}
                relationships={erdData.relationships}
                onEditTable={handleOpenTableEditor}
                readOnly={!isEditor}
                className="w-full h-[78vh] min-h-[620px]"
                focusTableName={diagramFocusTableName}
                focusNonce={diagramFocusNonce}
              />
            )}
            {isEditor && (
              <p className="mt-3 text-sm text-slate-500">
                Click an entity to highlight related tables. Double click to edit columns.
              </p>
            )}
          </div>
        )}
      </main>

      {activeTab === 'diagram' && isDiagramFullscreen && erdData && (
        <div className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm p-3 lg:p-5">
          <div className="h-full w-full rounded-2xl border border-slate-700 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 lg:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Entity Relationship Diagram</h2>
                <p className="text-sm text-slate-500">Fullscreen canvas for large schemas and dense entities.</p>
              </div>

              <button
                onClick={() => setIsDiagramFullscreen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition"
              >
                Close Full Screen
              </button>
            </div>

            <div className="p-3 lg:p-4 h-[calc(100%-73px)]">
              <ErDiagram
                tables={erdData.nodes}
                relationships={erdData.relationships}
                onEditTable={handleOpenTableEditor}
                readOnly={!isEditor}
                className="w-full h-full min-h-0"
                focusTableName={diagramFocusTableName}
                focusNonce={diagramFocusNonce}
              />
            </div>
          </div>
        </div>
      )}

      {isEditor && editingTableName && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50">
              <h3 className="text-xl font-semibold text-slate-900">Edit Entity: {editingTableName}</h3>
              <p className="text-sm text-slate-600 mt-1">One row per attribute, reflected in both ER view and DBML.</p>
            </div>

            <div className="p-6 overflow-auto max-h-[65vh] space-y-3">
              {editingColumns.map((column, index) => {
                const hasFkWarning =
                  column.isForeignKey && (!column.referenceTable || !column.referenceColumn);

                return (
                <div
                  key={`${editingTableName}-column-${index}`}
                  className={`grid grid-cols-12 gap-3 p-3 rounded-xl border transition-colors ${
                    hasFkWarning
                      ? 'border-amber-300 bg-amber-50/70'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <input
                    value={column.columnName}
                    onChange={(e) => handleColumnChange(index, 'columnName', e.target.value)}
                    placeholder="column_name"
                    className="col-span-4 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <input
                    value={column.columnType}
                    onChange={(e) => handleColumnChange(index, 'columnType', e.target.value)}
                    placeholder="varchar(255)"
                    className="col-span-3 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <input
                    value={column.defaultValue || ''}
                    onChange={(e) => handleColumnChange(index, 'defaultValue', e.target.value)}
                    placeholder="default value"
                    className="col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <label className="col-span-1 text-xs text-slate-700 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={column.isPrimaryKey}
                      onChange={(e) => handleColumnChange(index, 'isPrimaryKey', e.target.checked)}
                    /> PK
                  </label>
                  <label className="col-span-1 text-xs text-slate-700 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={column.isNotNull}
                      onChange={(e) => handleColumnChange(index, 'isNotNull', e.target.checked)}
                    /> NN
                  </label>
                  <label className="col-span-1 text-xs text-slate-700 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={column.isUnique}
                      onChange={(e) => handleColumnChange(index, 'isUnique', e.target.checked)}
                    /> UQ
                  </label>
                  <label className="col-span-1 text-xs text-slate-700 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={column.isForeignKey}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        handleColumnChange(index, 'isForeignKey', isChecked);
                        if (!isChecked) {
                          handleColumnChange(index, 'referenceTable', '');
                          handleColumnChange(index, 'referenceColumn', '');
                        }
                      }}
                    /> FK
                  </label>

                  {column.isForeignKey && (
                    <>
                      <select
                        value={column.referenceTable || ''}
                        onChange={(e) => {
                          const selectedTable = e.target.value;
                          const defaultReferenceColumn = erdData?.nodes.find((node) => node.tableName === selectedTable)?.columns[0]?.columnName || '';
                          handleColumnChange(index, 'referenceTable', selectedTable);
                          handleColumnChange(index, 'referenceColumn', defaultReferenceColumn);
                        }}
                        className="col-span-3 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option value="">Reference table</option>
                        {erdData?.nodes
                          .filter((node) => node.tableName !== editingTableName)
                          .map((node) => (
                            <option key={node.tableName} value={node.tableName}>
                              {node.tableName}
                            </option>
                          ))}
                      </select>

                      <select
                        value={column.referenceColumn || ''}
                        onChange={(e) => handleColumnChange(index, 'referenceColumn', e.target.value)}
                        className="col-span-3 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        disabled={!column.referenceTable}
                      >
                        <option value="">Reference column</option>
                        {(erdData?.nodes.find((node) => node.tableName === column.referenceTable)?.columns || []).map((refColumn) => (
                          <option key={`${column.referenceTable}-${refColumn.columnName}`} value={refColumn.columnName}>
                            {refColumn.columnName}
                          </option>
                        ))}
                      </select>

                      <select
                        value={column.relationType || 'one_to_many'}
                        onChange={(e) => handleColumnChange(index, 'relationType', e.target.value)}
                        className="col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option value="one_to_many">1:N</option>
                        <option value="one_to_one">1:1</option>
                        <option value="many_to_many">N:N</option>
                      </select>
                    </>
                  )}

                  {hasFkWarning && (
                    <div className="col-span-12 text-[11px] text-amber-700">
                      FK is enabled. Select both reference table and reference column.
                    </div>
                  )}

                  <div className="col-span-12 flex justify-end">
                    <button
                      onClick={() => handleRemoveColumn(index)}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                );
              })}

              <button
                onClick={handleAddColumn}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
              >
                Add Column
              </button>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
              <button
                onClick={() => {
                  setEditingTableName(null);
                  setEditingColumns([]);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTableChanges}
                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Apply to ER + DBML
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

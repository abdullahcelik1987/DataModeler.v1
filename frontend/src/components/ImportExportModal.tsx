'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ModelListDto } from '@/src/types/dbml';
import {
  DbmlProjectMetadata,
  ProjectEnvironment,
  buildProjectBlock,
  createDefaultProjectMetadata,
  getTodayIsoDate,
  parseProjectMetadata,
  upsertProjectBlock,
} from '@/src/lib/dbmlProjectMetadata';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type ImportExportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  models: ModelListDto[];
  canImport: boolean;
  currentUserEmail?: string;
  onImported: () => Promise<void>;
  onError: (message: string) => void;
};

type ExportFormat = 'dbml' | 'sql' | 'png' | 'jpeg' | 'pdf' | 'xmi';

function sanitizeFileName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function triggerTextDownload(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function mapDbmlTypeToSql(dbmlType: string): string {
  const normalized = dbmlType.trim().toLowerCase();
  if (normalized.startsWith('varchar') || normalized.startsWith('char')) return dbmlType;
  if (normalized.startsWith('int')) return 'INTEGER';
  if (normalized === 'uuid') return 'UUID';
  if (normalized.startsWith('decimal') || normalized.startsWith('numeric')) return dbmlType.toUpperCase();
  if (normalized.startsWith('bool')) return 'BOOLEAN';
  if (normalized.startsWith('timestamp')) return 'TIMESTAMP';
  if (normalized.startsWith('date')) return 'DATE';
  if (normalized.startsWith('text')) return 'TEXT';
  return dbmlType.toUpperCase();
}

function createSimpleSql(dbmlContent: string, erdData: { nodes: Array<{ tableName: string; columns: Array<{ columnName: string; columnType: string; isPrimaryKey: boolean; isNotNull: boolean; isUnique: boolean; defaultValue?: string }> }>; relationships: Array<{ fromTable: string; fromColumn: string; toTable: string; toColumn: string }> }) {
  const statements: string[] = [];

  for (const table of erdData.nodes) {
    const columnDefs = table.columns.map((column) => {
      const parts = [
        `${toSqlIdentifier(column.columnName)} ${mapDbmlTypeToSql(column.columnType)}`,
      ];
      if (column.isNotNull) parts.push('NOT NULL');
      if (column.isUnique) parts.push('UNIQUE');
      if (column.defaultValue && column.defaultValue.trim().length > 0) parts.push(`DEFAULT ${column.defaultValue}`);
      return `  ${parts.join(' ')}`;
    });

    const primaryKeys = table.columns.filter((column) => column.isPrimaryKey).map((column) => toSqlIdentifier(column.columnName));
    if (primaryKeys.length > 0) {
      columnDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
    }

    statements.push(`CREATE TABLE ${toSqlIdentifier(table.tableName)} (\n${columnDefs.join(',\n')}\n);`);
  }

  erdData.relationships.forEach((relationship, index) => {
    statements.push(
      `ALTER TABLE ${toSqlIdentifier(relationship.fromTable)} ADD CONSTRAINT ${toSqlIdentifier(`fk_${relationship.fromTable}_${relationship.fromColumn}_${index + 1}`)} FOREIGN KEY (${toSqlIdentifier(relationship.fromColumn)}) REFERENCES ${toSqlIdentifier(relationship.toTable)} (${toSqlIdentifier(relationship.toColumn)});`
    );
  });

  return `-- Generated from DataModeler\n-- Exported at ${new Date().toISOString()}\n\n${statements.join('\n\n')}\n\n-- Source DBML\n/*\n${dbmlContent}\n*/\n`;
}

function createSimpleXmi(erdData: { nodes: Array<{ tableName: string; columns: Array<{ columnName: string; columnType: string }> }>; relationships: Array<{ fromTable: string; fromColumn: string; toTable: string; toColumn: string; relationType?: string }> }) {
  const entities = erdData.nodes
    .map((node) => {
      const attrs = node.columns
        .map((col) => `    <ownedAttribute name="${col.columnName}" type="${col.columnType}" />`)
        .join('\n');
      return `  <packagedElement xmi:type="uml:Class" name="${node.tableName}">\n${attrs}\n  </packagedElement>`;
    })
    .join('\n');

  const relations = erdData.relationships
    .map((rel, index) => `  <packagedElement xmi:type="uml:Association" name="rel_${index + 1}" source="${rel.fromTable}.${rel.fromColumn}" target="${rel.toTable}.${rel.toColumn}" kind="${rel.relationType || 'one_to_many'}" />`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<xmi:XMI xmlns:xmi="http://www.omg.org/XMI" xmlns:uml="http://www.omg.org/spec/UML/20131001">\n<uml:Model xmi:id="model_1" name="DataModelerExport">\n${entities}\n${relations}\n</uml:Model>\n</xmi:XMI>\n`;
}

function createPreviewSvg(erdData: { nodes: Array<{ tableName: string; columns: Array<{ columnName: string; columnType: string }> }>; relationships: Array<{ fromTable: string; toTable: string }> }) {
  const nodeWidth = 240;
  const nodeHeight = 140;
  const columns = 4;
  const hGap = 70;
  const vGap = 50;

  const positions = new Map<string, { x: number; y: number }>();
  erdData.nodes.forEach((table, index) => {
    positions.set(table.tableName, {
      x: 30 + (index % columns) * (nodeWidth + hGap),
      y: 30 + Math.floor(index / columns) * (nodeHeight + vGap),
    });
  });

  const totalRows = Math.max(1, Math.ceil(erdData.nodes.length / columns));
  const width = 30 + columns * nodeWidth + (columns - 1) * hGap + 30;
  const height = 30 + totalRows * nodeHeight + (totalRows - 1) * vGap + 30;

  const edges = erdData.relationships.map((relationship, index) => {
    const src = positions.get(relationship.fromTable);
    const tgt = positions.get(relationship.toTable);
    if (!src || !tgt) return '';

    const x1 = src.x + nodeWidth;
    const y1 = src.y + nodeHeight / 2;
    const x2 = tgt.x;
    const y2 = tgt.y + nodeHeight / 2;

    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0f766e" stroke-width="2" marker-end="url(#arrow)" />`;
  }).join('\n');

  const nodes = erdData.nodes.map((table) => {
    const pos = positions.get(table.tableName);
    if (!pos) return '';
    const columnList = table.columns.slice(0, 5)
      .map((column, idx) => `<text x="${pos.x + 14}" y="${pos.y + 52 + idx * 16}" font-size="12" fill="#334155">${column.columnName}: ${column.columnType}</text>`)
      .join('\n');

    return `<g>
      <rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="${nodeHeight}" rx="12" fill="#ffffff" stroke="#cbd5e1" />
      <rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="34" rx="12" fill="#0f766e" />
      <text x="${pos.x + 12}" y="${pos.y + 22}" font-size="14" font-weight="700" fill="#ffffff">${table.tableName}</text>
      ${columnList}
    </g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#0f766e" />
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="#f8fafc" />
    ${edges}
    ${nodes}
  </svg>`;
}

async function exportDiagramAsImageOrPdf(format: 'png' | 'jpeg' | 'pdf', fileNameBase: string, erdData: { nodes: Array<{ tableName: string; columns: Array<{ columnName: string; columnType: string }> }>; relationships: Array<{ fromTable: string; toTable: string }> }) {
  const svgMarkup = createPreviewSvg(erdData);
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1600px';
  container.style.background = '#f8fafc';
  container.innerHTML = svgMarkup;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { backgroundColor: '#f8fafc', scale: 2 });

    if (format === 'pdf') {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 24, 24, pageWidth - 48, pageHeight - 48, undefined, 'FAST');
      pdf.save(`${fileNameBase}.pdf`);
      return;
    }

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.92 : 1;
    const dataUrl = canvas.toDataURL(mime, quality);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${fileNameBase}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    container.remove();
  }
}

export function ImportExportModal({
  isOpen,
  onClose,
  models,
  canImport,
  currentUserEmail,
  onImported,
  onError,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importing, setImporting] = useState(false);
  const [importedFileName, setImportedFileName] = useState('');
  const [importDbml, setImportDbml] = useState('');
  const [importModelName, setImportModelName] = useState('');
  const [importDescription, setImportDescription] = useState('');
  const [importMetadata, setImportMetadata] = useState<DbmlProjectMetadata>(
    createDefaultProjectMetadata({ environment: 'Development', owner: currentUserEmail || '' })
  );
  const [selectedExportModelId, setSelectedExportModelId] = useState('');
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat>('dbml');
  const [exporting, setExporting] = useState(false);

  const sortedModels = useMemo(() => [...models].sort((a, b) => a.name.localeCompare(b.name)), [models]);

  if (!isOpen) return null;

  const handleImportMetadataFieldChange = (field: keyof DbmlProjectMetadata, value: string) => {
    setImportMetadata((current) => ({ ...current, [field]: value }));
  };

  const handleDbmlFilePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseProjectMetadata(text);
      const guessedName = parsed.projectName || file.name.replace(/\.dbml$/i, '').trim() || 'ImportedModel';
      setImportedFileName(file.name);
      setImportDbml(text);
      setImportModelName(guessedName);
      setImportDescription(parsed.metadata.description || '');
      setImportMetadata(createDefaultProjectMetadata({
        ...parsed.metadata,
        owner: parsed.metadata.owner || currentUserEmail || '',
        lastUpdate: getTodayIsoDate(),
      }));
    } catch {
      onError('DBML file could not be read.');
    }
  };

  const handleImportSubmit = async () => {
    if (!canImport) {
      onError('Only admin users can import as new model.');
      return;
    }

    if (!importDbml.trim()) {
      onError('Please upload a DBML file first.');
      return;
    }

    if (!importModelName.trim()) {
      onError('Model name is required.');
      return;
    }

    setImporting(true);
    try {
      const normalizedMetadata: DbmlProjectMetadata = {
        ...importMetadata,
        databaseType: importMetadata.databaseType || 'PostgreSQL',
        description: importDescription.trim(),
        owner: importMetadata.owner || currentUserEmail || '',
        version: importMetadata.version || '1.0.0',
        lastUpdate: getTodayIsoDate(),
      };

      const withProjectMetadata = upsertProjectBlock(importDbml, importModelName.trim(), normalizedMetadata);
      const finalDbml = withProjectMetadata.includes('Project "')
        ? withProjectMetadata
        : `${buildProjectBlock(importModelName.trim(), normalizedMetadata)}\n\n${withProjectMetadata}`;

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: importModelName.trim(),
          description: importDescription.trim(),
          databaseDialect: normalizedMetadata.databaseType,
          initialDbml: finalDbml,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import model');
      }

      await onImported();
      onClose();
    } catch {
      onError('Import failed. Please verify DBML and metadata values.');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    if (!selectedExportModelId) {
      onError('Please select a model for export.');
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/${selectedExportModelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load model for export');
      }

      const model = await response.json();
      const modelName = sanitizeFileName(model.name || 'model');
      const dbmlContent = String(model.dbmlContent || '');
      const erdData = model.erdData || { nodes: [], relationships: [] };

      if (selectedExportFormat === 'dbml') {
        triggerTextDownload(`${modelName}.dbml`, dbmlContent, 'text/plain;charset=utf-8');
      } else if (selectedExportFormat === 'sql') {
        const sqlScript = createSimpleSql(dbmlContent, erdData);
        triggerTextDownload(`${modelName}.sql`, sqlScript, 'text/sql;charset=utf-8');
      } else if (selectedExportFormat === 'xmi') {
        const xmi = createSimpleXmi(erdData);
        triggerTextDownload(`${modelName}.xmi`, xmi, 'application/xml;charset=utf-8');
      } else if (selectedExportFormat === 'png' || selectedExportFormat === 'jpeg' || selectedExportFormat === 'pdf') {
        await exportDiagramAsImageOrPdf(selectedExportFormat, modelName, erdData);
      }
    } catch {
      onError('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Import / Export</h2>
            <p className="text-sm text-slate-500">Import DBML with metadata or export models into multiple formats.</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="mb-5 inline-flex rounded-lg border border-slate-300 p-1 bg-slate-100">
          <button
            onClick={() => setActiveTab('import')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Import
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === 'export' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Export
          </button>
        </div>

        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Upload DBML File</label>
              <input
                type="file"
                accept=".dbml,text/plain"
                onChange={handleDbmlFilePicked}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
              />
              {importedFileName && (
                <p className="mt-2 text-xs text-slate-500">Loaded: {importedFileName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Model Name*</label>
                <input
                  type="text"
                  value={importModelName}
                  onChange={(e) => setImportModelName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Database Type</label>
                <select
                  value={importMetadata.databaseType}
                  onChange={(e) => handleImportMetadataFieldChange('databaseType', e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MySQL">MySQL</option>
                  <option value="SQL Server">SQL Server</option>
                  <option value="Oracle">Oracle</option>
                  <option value="SQLite">SQLite</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Environment</label>
                <select
                  value={importMetadata.environment}
                  onChange={(e) => handleImportMetadataFieldChange('environment', e.target.value as ProjectEnvironment)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="Development">Development</option>
                  <option value="Test">Test</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Owner</label>
                <input
                  type="text"
                  value={importMetadata.owner}
                  onChange={(e) => handleImportMetadataFieldChange('owner', e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Version</label>
                <input
                  type="text"
                  value={importMetadata.version}
                  onChange={(e) => handleImportMetadataFieldChange('version', e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Contact</label>
                <input
                  type="email"
                  value={importMetadata.contact}
                  onChange={(e) => handleImportMetadataFieldChange('contact', e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Business Domain</label>
                <input
                  type="text"
                  value={importMetadata.businessDomain}
                  onChange={(e) => handleImportMetadataFieldChange('businessDomain', e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleImportSubmit}
                disabled={importing || !canImport}
                className="inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import DBML as New Model'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Select Model</label>
                <select
                  value={selectedExportModelId}
                  onChange={(e) => setSelectedExportModelId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="">Choose a model</option>
                  {sortedModels.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Export Format</label>
                <select
                  value={selectedExportFormat}
                  onChange={(e) => setSelectedExportFormat(e.target.value as ExportFormat)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="dbml">DBML</option>
                  <option value="sql">SQL</option>
                  <option value="png">PNG (diagram)</option>
                  <option value="jpeg">JPEG (diagram)</option>
                  <option value="pdf">PDF (diagram)</option>
                  <option value="xmi">XMI (UML exchange)</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Export supports DBML, SQL DDL, diagram image formats (PNG/JPEG/PDF), and XMI for UML-style model exchange.
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex h-11 items-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

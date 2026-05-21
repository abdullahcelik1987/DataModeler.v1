'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { DbmlEditor } from '@/src/components/DbmlEditor';
import { ErDiagram } from '@/src/components/ErDiagram';
import { ModelDetailDto, ErdDataDto, DbmlColumnDto } from '@/src/types/dbml';
import {
  DbmlProjectMetadata,
  ProjectMetadataFieldDefinition,
  createDefaultProjectMetadata,
  getTodayIsoDate,
  parseProjectMetadata,
  sanitizeMetadataByDefinitions,
  setMetadataFieldValue,
  toProjectMetadataPayload,
  upsertProjectBlock,
} from '@/src/lib/dbmlProjectMetadata';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

const RELATION_SYMBOL: Record<string, string> = {
  one_to_one: '-',
  one_to_many: '>',
  many_to_many: '<>',
};

type EditableColumn = DbmlColumnDto & {
  baseType: string;
  typeArgs: Record<string, string>;
  isForeignKey: boolean;
  referenceTable?: string;
  referenceColumn?: string;
  relationType?: 'one_to_one' | 'one_to_many' | 'many_to_many';
};

type DraftTableColumn = {
  columnName: string;
  baseType: string;
  typeArgs: Record<string, string>;
  note?: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isNotNull: boolean;
  isAutoIncrement: boolean;
  isForeignKey: boolean;
  referenceTable?: string;
  referenceColumn?: string;
  relationType?: 'one_to_one' | 'one_to_many' | 'many_to_many';
};

type DatabaseTypeOption = {
  id?: string;
  name: string;
  inputTemplate?: string;
  parameters?: DatabaseTypeParameter[];
  requiresLength: boolean;
  supportsPrecisionScale: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

type DatabaseTypeParameter = {
  key: string;
  label: string;
  inputType: 'text' | 'number' | string;
  defaultValue?: string;
};

type DatabaseSystemCatalog = {
  id?: string;
  name: string;
  key: string;
  isActive?: boolean;
  dataTypes: DatabaseTypeOption[];
};

const DIALECT_COLUMN_TYPES: Record<string, string[]> = {
  postgresql: ['bigint', 'integer', 'smallint', 'varchar', 'char', 'text', 'boolean', 'date', 'timestamp', 'numeric', 'uuid', 'jsonb'],
  mysql: ['bigint', 'int', 'smallint', 'varchar', 'char', 'text', 'boolean', 'date', 'datetime', 'decimal', 'json'],
  sqlserver: ['bigint', 'int', 'smallint', 'varchar', 'nvarchar', 'char', 'nchar', 'text', 'bit', 'date', 'datetime2', 'decimal', 'uniqueidentifier'],
  oracle: ['number', 'varchar2', 'char', 'nvarchar2', 'nchar', 'clob', 'date', 'timestamp'],
  sqlite: ['integer', 'real', 'text', 'blob', 'numeric', 'varchar'],
};

const VARIABLE_LENGTH_TYPES = new Set(['varchar', 'char', 'nvarchar', 'nchar', 'varchar2', 'nvarchar2']);
const PRECISION_SCALE_TYPES = new Set(['numeric', 'decimal', 'number']);

function normalizeDatabaseType(databaseType: string): keyof typeof DIALECT_COLUMN_TYPES {
  const normalized = databaseType.trim().toLowerCase();
  if (normalized.includes('sql server') || normalized.includes('sqlserver')) return 'sqlserver';
  if (normalized.includes('mysql')) return 'mysql';
  if (normalized.includes('oracle')) return 'oracle';
  if (normalized.includes('sqlite')) return 'sqlite';
  return 'postgresql';
}

function buildColumnType(baseType: string, length?: string, precision?: string, scale?: string): string {
  const normalizedType = baseType.trim().toLowerCase();
  if (VARIABLE_LENGTH_TYPES.has(normalizedType)) {
    const parsedLength = Number.parseInt((length || '').trim(), 10);
    const safeLength = Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : 255;
    return `${baseType}(${safeLength})`;
  }

  if (PRECISION_SCALE_TYPES.has(normalizedType)) {
    const parsedPrecision = Number.parseInt((precision || '').trim(), 10);
    const parsedScale = Number.parseInt((scale || '').trim(), 10);

    if (Number.isFinite(parsedPrecision) && parsedPrecision > 0) {
      if (Number.isFinite(parsedScale) && parsedScale >= 0) {
        return `${baseType}(${parsedPrecision},${parsedScale})`;
      }
      return `${baseType}(${parsedPrecision})`;
    }
  }

  return baseType;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTemplatePlaceholders(template: string): string[] {
  const keys: string[] = [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

function normalizeTypeOption(option: DatabaseTypeOption): DatabaseTypeOption {
  const template = option.inputTemplate && option.inputTemplate.trim().length > 0 ? option.inputTemplate.trim() : option.name;
  const normalizedParams = (option.parameters || []).filter((p) => p.key && p.key.trim().length > 0);
  return {
    ...option,
    inputTemplate: template,
    parameters: normalizedParams,
  };
}

function getInitialTypeArgs(option?: DatabaseTypeOption): Record<string, string> {
  const args: Record<string, string> = {};
  (option?.parameters || []).forEach((parameter) => {
    args[parameter.key] = parameter.defaultValue || '';
  });
  return args;
}

function renderColumnType(option: DatabaseTypeOption | undefined, baseType: string, typeArgs: Record<string, string>): string {
  if (!option) {
    const length = typeArgs.length || typeArgs.L || '';
    const precision = typeArgs.precision || '';
    const scale = typeArgs.scale || '';
    return buildColumnType(baseType, length, precision, scale);
  }

  const template = option.inputTemplate || option.name;
  const rendered = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey: string) => {
    const value = typeArgs[rawKey] ?? '';
    return `${value}`;
  });

  return rendered.trim();
}

function buildTemplateMatcher(template: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const placeholderRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let pattern = '^';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(template)) !== null) {
    const staticPart = template.slice(lastIndex, match.index);
    pattern += escapeRegex(staticPart).replace(/\s+/g, '\\s*');
    pattern += '(.*?)';
    keys.push(match[1]);
    lastIndex = match.index + match[0].length;
  }

  const tail = template.slice(lastIndex);
  pattern += escapeRegex(tail).replace(/\s+/g, '\\s*');
  pattern += '$';

  return { regex: new RegExp(pattern, 'i'), keys };
}

function findTypeOptionForColumnType(columnType: string, options: DatabaseTypeOption[]): DatabaseTypeOption | undefined {
  const normalizedType = columnType.trim();

  for (const option of options) {
    const template = (option.inputTemplate || option.name || '').trim();
    if (!template) continue;

    const placeholders = getTemplatePlaceholders(template);
    if (placeholders.length === 0) {
      if (template.toLowerCase() === normalizedType.toLowerCase()) {
        return option;
      }
      continue;
    }

    try {
      const matcher = buildTemplateMatcher(template);
      if (matcher.regex.test(normalizedType)) {
        return option;
      }
    } catch {
      // Ignore malformed template regex and continue with fallback matching.
    }
  }

  const parsed = parseColumnType(normalizedType);
  return options.find((option) => option.name.toLowerCase() === parsed.baseType.toLowerCase());
}

function parseTypeArgsFromTemplate(columnType: string, option: DatabaseTypeOption | undefined): Record<string, string> {
  if (!option || !option.inputTemplate) {
    const parsed = parseColumnType(columnType);
    return {
      length: parsed.length || '',
      precision: parsed.precision || '',
      scale: parsed.scale || '',
    };
  }

  const template = option.inputTemplate;
  const placeholders = getTemplatePlaceholders(template);
  const initialArgs = getInitialTypeArgs(option);
  if (placeholders.length === 0) {
    return initialArgs;
  }

  const matcher = buildTemplateMatcher(template);
  const match = matcher.regex.exec(columnType.trim());
  if (!match) {
    return initialArgs;
  }

  const args: Record<string, string> = { ...initialArgs };
  matcher.keys.forEach((key, index) => {
    const capture = (match[index + 1] || '').trim();
    if (capture.length > 0 || !args[key]) {
      args[key] = capture;
    }
  });

  return args;
}

function parseColumnType(columnType: string): { baseType: string; length?: string; precision?: string; scale?: string } {
  const normalized = columnType.trim();
  const match = /^([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?$/.exec(normalized);

  if (!match) {
    return { baseType: normalized };
  }

  const baseType = match[1];
  const args = match[2]?.split(',').map((item) => item.trim()).filter(Boolean) || [];
  if (args.length === 0) {
    return { baseType };
  }

  if (args.length === 1) {
    return { baseType, length: args[0], precision: args[0] };
  }

  return { baseType, precision: args[0], scale: args[1] };
}

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

type ModelEditorWorkspaceProps = {
  modelId: string;
  isEmbedded?: boolean;
};

export function ModelEditorWorkspace({ modelId, isEmbedded = false }: ModelEditorWorkspaceProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [model, setModel] = useState<ModelDetailDto | null>(null);
  const [dbmlContent, setDbmlContent] = useState<string>('');
  const [erdData, setErdData] = useState<ErdDataDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
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
  const [metadataFields, setMetadataFields] = useState<ProjectMetadataFieldDefinition[]>([]);
  const [ownerGroups, setOwnerGroups] = useState<string[]>([]);
  const [databaseTypeCatalog, setDatabaseTypeCatalog] = useState<DatabaseSystemCatalog[]>([]);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableNote, setNewTableNote] = useState('');
  const [newTableColumns, setNewTableColumns] = useState<DraftTableColumn[]>([]);

  useEffect(() => {
    if (!modelId) {
      setLoading(false);
      return;
    }

    if (!isAuthenticated && !isEmbedded) {
      router.push('/login');
      return;
    }

    fetchModel();
  }, [isAuthenticated, isEmbedded, modelId]);

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
      let baseMetadata = createDefaultProjectMetadata({
        databaseType: data.databaseDialect || parsedProject.metadata.databaseType,
        owner: parsedProject.metadata.owner || user?.email || '',
        description: parsedProject.metadata.description,
        version: parsedProject.metadata.version,
        lastUpdate: parsedProject.metadata.lastUpdate || getTodayIsoDate(),
        environment: parsedProject.metadata.environment,
        contact: parsedProject.metadata.contact,
        customFields: {
          ...parsedProject.metadata.customFields,
        },
      });

      Object.entries(data.projectMetadata || {}).forEach(([key, value]) => {
        const normalizedValue = typeof value === 'string' ? value : String(value ?? '');
        baseMetadata = setMetadataFieldValue(baseMetadata, key, normalizedValue);
      });

      setProjectMetadata(baseMetadata);

      await Promise.all([fetchDatabaseTypeCatalog(), fetchMetadataFields(), fetchOwnerGroups()]);

      setLoading(false);
    } catch (err) {
      setError('Failed to load model');
      setLoading(false);
    }
  };

  const fetchMetadataFields = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/project-metadata/fields`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load metadata fields');
      }

      const payload = (await response.json()) as ProjectMetadataFieldDefinition[];
      const active = (payload || []).filter(
        (field) => field.isActive && field.fieldKey.trim().toLowerCase() !== 'business_domain'
      );
      setMetadataFields(active);
      setProjectMetadata((current) => sanitizeMetadataByDefinitions(current, active));
    } catch {
      setMetadataFields([]);
    }
  };

  const fetchOwnerGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/models/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load owner groups');
      }

      const payload = (await response.json()) as Array<{ name?: string }>;
      const names = (payload || [])
        .map((item) => (item.name || '').trim())
        .filter((name) => name.length > 0 && name.localeCompare('Ungrouped', undefined, { sensitivity: 'base' }) !== 0)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      setOwnerGroups(Array.from(new Set(names)));
    } catch {
      setOwnerGroups([]);
    }
  };

  const fetchDatabaseTypeCatalog = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/database-type-catalog`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as DatabaseSystemCatalog[];
      setDatabaseTypeCatalog((data || []).filter((system) => (system.isActive ?? true)));
    } catch {
      // Fallback to in-file defaults when catalog cannot be fetched.
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

  const handleCustomMetadataChange = (fieldKey: string, value: string) => {
    setProjectMetadata((current) => setMetadataFieldValue(current, fieldKey, value));
  };

  const handleOpenTableEditor = (tableName: string) => {
    if (!isEditor || !erdData) return;

    const targetTable = erdData.nodes.find((node) => node.tableName === tableName);
    if (!targetTable) return;

    const columnsWithRelationshipInfo: EditableColumn[] = targetTable.columns.map((column) => {
      const outgoingRelationship = erdData.relationships.find(
        (relationship) => relationship.fromTable === tableName && relationship.fromColumn === column.columnName
      );
      const parsedType = parseColumnType(column.columnType);
        const typeOption = findTypeOptionForColumnType(column.columnType, availableTypeOptions);
        const baseType = typeOption?.name || parsedType.baseType;

      return {
        ...column,
        baseType,
        typeArgs: parseTypeArgsFromTemplate(column.columnType, typeOption),
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
      currentColumns.map((column, columnIndex) => {
        if (columnIndex !== index) return column;

        const nextColumn = { ...column, [field]: value } as EditableColumn;
        if (field === 'baseType') {
          const selectedTypeOption = availableTypeOptions.find((option) => option.name.toLowerCase() === String(value).toLowerCase());
          nextColumn.typeArgs = getInitialTypeArgs(selectedTypeOption);
        }

        return nextColumn;
      })
    );
  };

  const handleColumnTypeArgChange = (index: number, key: string, value: string) => {
    setEditingColumns((currentColumns) =>
      currentColumns.map((column, columnIndex) =>
        columnIndex === index
          ? {
              ...column,
              typeArgs: {
                ...column.typeArgs,
                [key]: value,
              },
            }
          : column
      )
    );
  };

  const handleAddColumn = () => {
    const defaultType = availableColumnTypes[0] || 'varchar';
    const defaultTypeOption = availableTypeOptions.find((option) => option.name.toLowerCase() === defaultType.toLowerCase());
    setEditingColumns((currentColumns) => [
      ...currentColumns,
      {
        columnName: 'new_column',
        baseType: defaultType,
        typeArgs: getInitialTypeArgs(defaultTypeOption),
        columnType: renderColumnType(defaultTypeOption, defaultType, getInitialTypeArgs(defaultTypeOption)),
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
      .filter((column) => column.columnName.trim().length > 0 && column.baseType.trim().length > 0)
      .map((column) => ({
        columnName: column.columnName.trim(),
        columnType: renderColumnType(
          availableTypeOptions.find((option) => option.name.toLowerCase() === column.baseType.trim().toLowerCase()),
          column.baseType.trim(),
          column.typeArgs
        ),
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
      const metadataToSave: DbmlProjectMetadata = sanitizeMetadataByDefinitions({
        ...projectMetadata,
        databaseType: projectMetadata.databaseType || model.databaseDialect || 'PostgreSQL',
        owner: projectMetadata.owner || user?.email || '',
        version: projectMetadata.version || '1.0.0',
        lastUpdate: getTodayIsoDate(),
      }, metadataFields);
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
          projectMetadata: toProjectMetadataPayload(metadataToSave),
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

  const handleSubmitForApproval = async () => {
    if (!model) return;

    setSubmittingForApproval(true);
    setError(null);

    try {
      const metadataToSave: DbmlProjectMetadata = sanitizeMetadataByDefinitions({
        ...projectMetadata,
        databaseType: projectMetadata.databaseType || model.databaseDialect || 'PostgreSQL',
        owner: projectMetadata.owner || user?.email || '',
        version: projectMetadata.version || '1.0.0',
        lastUpdate: getTodayIsoDate(),
      }, metadataFields);

      const dbmlWithMetadata = upsertProjectBlock(dbmlContent, model.name, metadataToSave);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/change-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modelId,
          title: `${model.name} - Change Request`,
          description: changeSummary || `Change proposal for model ${model.name}`,
          newDbmlSnapshot: dbmlWithMetadata,
          submitForApproval: true,
        }),
      });

      if (!response.ok) {
        let errorDetail = 'Failed to submit change request';
        try {
          const errorResponse = await response.json();
          errorDetail = errorResponse.message || JSON.stringify(errorResponse);
        } catch (e) {
          errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        }
        console.error('CR submission error:', errorDetail);
        throw new Error(errorDetail);
      }

      setStatusMessage('Change request submitted for approval.');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit for approval';
      setError(msg);
      console.error('Submit for approval error:', msg);
    } finally {
      setSubmittingForApproval(false);
    }
  };

  const createDraftColumn = (defaultType: string): DraftTableColumn => ({
    columnName: '',
    baseType: defaultType,
    typeArgs: getInitialTypeArgs(availableTypeOptions.find((option) => option.name.toLowerCase() === defaultType.toLowerCase())),
    note: '',
    isPrimaryKey: false,
    isUnique: false,
    isNotNull: false,
    isAutoIncrement: false,
    isForeignKey: false,
    relationType: 'one_to_many',
    referenceTable: '',
    referenceColumn: '',
  });

  const resetCreateTableForm = () => {
    const defaultType = availableColumnTypes[0] || 'varchar';
    setNewTableName('');
    setNewTableNote('');
    setNewTableColumns([
      {
        ...createDraftColumn(defaultType),
        columnName: 'id',
        isPrimaryKey: true,
        isNotNull: true,
        isAutoIncrement: true,
      },
    ]);
  };

  const handleOpenCreateTableModal = () => {
    if (!isEditor) return;
    resetCreateTableForm();
    setIsCreateTableOpen(true);
  };

  const handleCreateTableColumnChange = (index: number, field: keyof DraftTableColumn, value: string | boolean) => {
    setNewTableColumns((currentColumns) =>
      currentColumns.map((column, columnIndex) => {
        if (columnIndex !== index) return column;

        const nextColumn = { ...column, [field]: value } as DraftTableColumn;

        if (field === 'baseType') {
          const selectedTypeOption = availableTypeOptions.find((option) => option.name.toLowerCase() === String(value).toLowerCase());
          nextColumn.typeArgs = getInitialTypeArgs(selectedTypeOption);
        }

        return nextColumn;
      })
    );
  };

  const handleCreateTableTypeArgChange = (index: number, key: string, value: string) => {
    setNewTableColumns((currentColumns) =>
      currentColumns.map((column, columnIndex) =>
        columnIndex === index
          ? {
              ...column,
              typeArgs: {
                ...column.typeArgs,
                [key]: value,
              },
            }
          : column
      )
    );
  };

  const handleAddCreateTableColumn = () => {
    const defaultType = availableColumnTypes[0] || 'varchar';
    setNewTableColumns((current) => [...current, createDraftColumn(defaultType)]);
  };

  const handleRemoveCreateTableColumn = (index: number) => {
    setNewTableColumns((currentColumns) => currentColumns.filter((_, columnIndex) => columnIndex !== index));
  };

  const handleCreateTable = async () => {
    const tableName = newTableName.trim();
    if (!tableName) {
      setError('Table name is required.');
      return;
    }

    const currentErd: ErdDataDto = erdData || { nodes: [], relationships: [], validationErrors: [] };
    const tableExists = currentErd.nodes.some((node) => node.tableName.toLowerCase() === tableName.toLowerCase());
    if (tableExists) {
      setError('A table with this name already exists.');
      return;
    }

    const normalizedColumns: DbmlColumnDto[] = [];
    const fkRelationships: ErdDataDto['relationships'] = [];

    for (const column of newTableColumns) {
      const columnName = column.columnName.trim();
      if (!columnName) {
        continue;
      }

      const resolvedType = renderColumnType(
        availableTypeOptions.find((option) => option.name.toLowerCase() === column.baseType.toLowerCase()),
        column.baseType,
        column.typeArgs
      );
      normalizedColumns.push({
        columnName,
        columnType: resolvedType,
        isPrimaryKey: column.isPrimaryKey,
        isUnique: column.isUnique,
        isNotNull: column.isNotNull,
        isAutoIncrement: column.isAutoIncrement,
        defaultValue: undefined,
        note: column.note?.trim() || undefined,
      });

      if (column.isForeignKey) {
        if (!column.referenceTable || !column.referenceColumn) {
          setError(`Foreign key reference is missing for column ${columnName}.`);
          return;
        }

        fkRelationships.push({
          fromTable: tableName,
          fromColumn: columnName,
          toTable: column.referenceTable,
          toColumn: column.referenceColumn,
          relationType: (column.relationType || 'one_to_many') as 'one_to_one' | 'one_to_many' | 'many_to_many',
        });
      }
    }

    if (normalizedColumns.length === 0) {
      setError('Add at least one column with name and type.');
      return;
    }

    const updatedErdData: ErdDataDto = {
      ...currentErd,
      nodes: [
        ...currentErd.nodes,
        {
          tableName,
          note: newTableNote.trim() || undefined,
          columns: normalizedColumns,
        },
      ],
      relationships: [...currentErd.relationships, ...fkRelationships],
    };

    const nextDbml = generateDbmlFromErd(updatedErdData);
    setErdData(updatedErdData);
    setDbmlContent(nextDbml);
    await parseDbmlToErd(nextDbml);

    setIsCreateTableOpen(false);
    setStatusMessage(`Table ${tableName} added. Remember to save model changes.`);
    setTimeout(() => setStatusMessage(null), 3000);
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
    if (isEmbedded) {
      return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">Loading model editor...</div>;
    }

    return <div className="dm-page flex items-center justify-center"><div className="dm-surface p-6 text-slate-600">Loading...</div></div>;
  }

  if (!model) {
    if (isEmbedded) {
      return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">Model not found</div>;
    }

    return <div className="dm-page flex items-center justify-center"><div className="dm-surface p-6 text-slate-600">Model not found</div></div>;
  }

  const isEditor = ['admin', 'owner', 'editor', 'developer', 'domain_architect', 'data_architect'].includes((model.yourRole || '').toLowerCase());
  const databaseType = projectMetadata.databaseType || model.databaseDialect || 'PostgreSQL';
  const dialectKey = normalizeDatabaseType(databaseType);
  const catalogSystem = databaseTypeCatalog.find(
    (system) => normalizeDatabaseType(system.name) === dialectKey || system.key === dialectKey
  );

  const toFallbackOption = (typeName: string, index: number): DatabaseTypeOption => {
    const requiresLength = VARIABLE_LENGTH_TYPES.has(typeName.toLowerCase());
    const supportsPrecisionScale = PRECISION_SCALE_TYPES.has(typeName.toLowerCase());
    const parameters: DatabaseTypeParameter[] = requiresLength
      ? [{ key: 'length', label: 'Length', inputType: 'number', defaultValue: '255' }]
      : supportsPrecisionScale
        ? [
            { key: 'precision', label: 'Precision', inputType: 'number', defaultValue: '18' },
            { key: 'scale', label: 'Scale', inputType: 'number', defaultValue: '2' },
          ]
        : [];

    const inputTemplate = requiresLength
      ? `${typeName}({{length}})`
      : supportsPrecisionScale
        ? `${typeName}({{precision}},{{scale}})`
        : typeName;

    return {
      name: typeName,
      requiresLength,
      supportsPrecisionScale,
      parameters,
      inputTemplate,
      sortOrder: (index + 1) * 10,
    };
  };

  const availableTypeOptions: DatabaseTypeOption[] = catalogSystem
    ? catalogSystem.dataTypes
        .filter((type) => type.isActive ?? true)
        .slice()
        .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
        .map((option) => normalizeTypeOption(option))
    : DIALECT_COLUMN_TYPES[dialectKey].map((typeName, index) => ({
        ...toFallbackOption(typeName, index),
      }));

  const availableColumnTypes = availableTypeOptions.map((option) => option.name);
  const availableDatabaseSystems = databaseTypeCatalog.length > 0
    ? databaseTypeCatalog.map((system) => system.name)
    : ['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'SQLite'];

  return (
    <div className={isEmbedded ? '' : 'dm-page'}>
      <div className={isEmbedded ? '' : 'dm-shell overflow-hidden rounded-3xl border border-slate-200 bg-white/75 shadow-xl backdrop-blur'}>
      <div className="px-6 pt-4">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Project Metadata */}
      <section className="border-b border-slate-200 bg-white/80">
        <div className="px-6 py-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
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
                  className="dm-select h-10"
                >
                  {availableDatabaseSystems.map((systemName) => (
                    <option key={systemName} value={systemName}>{systemName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Environment</label>
                <select
                  value={projectMetadata.environment}
                  onChange={(e) => handleProjectMetadataChange('environment', e.target.value)}
                  disabled={!isEditor}
                  className="dm-select h-10"
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
                  className="dm-input h-10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Version</label>
                <input
                  type="text"
                  value={projectMetadata.version}
                  onChange={(e) => handleProjectMetadataChange('version', e.target.value)}
                  disabled={!isEditor}
                  className="dm-input h-10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Owner Group</label>
                <select
                  value={projectMetadata.ownerGroup || ''}
                  onChange={(e) => handleProjectMetadataChange('ownerGroup', e.target.value)}
                  disabled={!isEditor}
                  className="dm-select h-10"
                >
                  <option value="">Select Organization Unit</option>
                  {ownerGroups.map((groupName) => (
                    <option key={groupName} value={groupName}>{groupName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Contact</label>
                <input
                  type="email"
                  value={projectMetadata.contact}
                  onChange={(e) => handleProjectMetadataChange('contact', e.target.value)}
                  disabled={!isEditor}
                  className="dm-input h-10"
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

              {metadataFields
                .filter((field) => field.isActive && !field.isSystem)
                .map((field) => {
                  const value = projectMetadata.customFields[field.fieldKey] || '';
                  return (
                    <div key={field.fieldKey} className="lg:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        {field.displayName}{field.isRequired ? '*' : ''}
                      </label>
                      {field.fieldType === 'textarea' ? (
                        <textarea
                          value={value}
                          onChange={(e) => handleCustomMetadataChange(field.fieldKey, e.target.value)}
                          disabled={!isEditor}
                          rows={2}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                      ) : field.fieldType === 'select' ? (
                        <select
                          value={value}
                          onChange={(e) => handleCustomMetadataChange(field.fieldKey, e.target.value)}
                          disabled={!isEditor}
                          className="dm-select h-10"
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleCustomMetadataChange(field.fieldKey, e.target.value)}
                          disabled={!isEditor}
                          className="dm-input h-10"
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">Project Description</label>
              <textarea
                value={projectMetadata.description}
                onChange={(e) => handleProjectMetadataChange('description', e.target.value)}
                disabled={!isEditor}
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Controls */}
      <div className="border-b border-slate-200 bg-white/80">
        <div className="px-6 py-4">
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
                  className="dm-input"
                />
                <button
                  onClick={handleSaveModel}
                  disabled={saving}
                  className="dm-btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleSubmitForApproval}
                  disabled={saving || submittingForApproval}
                  className="dm-btn-secondary"
                >
                  {submittingForApproval ? 'Submitting...' : 'Onaya Gonder'}
                </button>
              </div>
            )}
          </div>

          {!isEditor && (
            <p className="mt-3 text-sm text-slate-500">
              You have read-only access to this model.
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-6 lg:px-6">
        {activeTab === 'editor' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:p-6">
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
                  className="dm-input h-10 flex-1"
                />
                <button
                  onClick={handleDbmlSearch}
                  className="dm-btn-primary h-10"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:p-6">
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
                  className="dm-input h-10 flex-1"
                />
                <button
                  onClick={handleDiagramSearch}
                  className="dm-btn-primary h-10"
                >
                  Focus
                </button>
                <button
                  onClick={() => setIsDiagramFullscreen(true)}
                  className="dm-btn-secondary h-10"
                >
                  Full Screen
                </button>
                {isEditor && (
                  <button
                    onClick={handleOpenCreateTableModal}
                    className="dm-btn-primary h-10"
                  >
                    Create Table
                  </button>
                )}
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
                className="dm-btn-secondary"
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

      {isEditor && isCreateTableOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-cyan-50">
              <h3 className="text-xl font-semibold text-slate-900">Create Table</h3>
              <p className="text-sm text-slate-600 mt-1">Database: {databaseType}. Data types are controlled by dialect-specific options.</p>
            </div>

            <div className="p-6 overflow-auto max-h-[68vh] space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Table Name</label>
                  <input
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="orders"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Table Description</label>
                  <input
                    value={newTableNote}
                    onChange={(e) => setNewTableNote(e.target.value)}
                    placeholder="Optional table note"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>

              {newTableColumns.map((column, index) => {
                const selectedTypeOption = availableTypeOptions.find((option) => option.name.toLowerCase() === column.baseType.toLowerCase());
                const selectedTypeParams = selectedTypeOption?.parameters || [];
                const hasFkWarning = column.isForeignKey && (!column.referenceTable || !column.referenceColumn);

                return (
                  <div
                    key={`new-table-column-${index}`}
                    className={`grid grid-cols-12 gap-3 p-3 rounded-xl border ${hasFkWarning ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <input
                      value={column.columnName}
                      onChange={(e) => handleCreateTableColumnChange(index, 'columnName', e.target.value)}
                      placeholder="column_name"
                      className="col-span-3 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />

                    <select
                      value={column.baseType}
                      onChange={(e) => handleCreateTableColumnChange(index, 'baseType', e.target.value)}
                      className="col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    >
                      {availableColumnTypes.map((typeName) => (
                        <option key={typeName} value={typeName}>{typeName}</option>
                      ))}
                    </select>

                    <div className="col-span-3 flex flex-wrap gap-2">
                      {selectedTypeParams.length > 0 ? selectedTypeParams.map((parameter) => (
                        <input
                          key={`${column.baseType}-${parameter.key}-${index}`}
                          value={column.typeArgs[parameter.key] || ''}
                          onChange={(e) => handleCreateTableTypeArgChange(index, parameter.key, e.target.value)}
                          placeholder={parameter.label}
                          type={parameter.inputType === 'number' ? 'number' : 'text'}
                          className="min-w-[90px] flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      )) : (
                        <span className="text-xs text-slate-500 self-center">No arguments</span>
                      )}
                    </div>

                    <input
                      value={column.note || ''}
                      onChange={(e) => handleCreateTableColumnChange(index, 'note', e.target.value)}
                      placeholder="Column note"
                      className="col-span-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />

                    <label className="col-span-1 text-xs text-slate-700 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={column.isPrimaryKey}
                        onChange={(e) => handleCreateTableColumnChange(index, 'isPrimaryKey', e.target.checked)}
                      /> PK
                    </label>
                    <label className="col-span-1 text-xs text-slate-700 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={column.isNotNull}
                        onChange={(e) => handleCreateTableColumnChange(index, 'isNotNull', e.target.checked)}
                      /> NN
                    </label>
                    <label className="col-span-1 text-xs text-slate-700 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={column.isUnique}
                        onChange={(e) => handleCreateTableColumnChange(index, 'isUnique', e.target.checked)}
                      /> UQ
                    </label>
                    <label className="col-span-1 text-xs text-slate-700 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={column.isForeignKey}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          handleCreateTableColumnChange(index, 'isForeignKey', isChecked);
                          if (!isChecked) {
                            handleCreateTableColumnChange(index, 'referenceTable', '');
                            handleCreateTableColumnChange(index, 'referenceColumn', '');
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
                            const defaultRefColumn = erdData?.nodes.find((node) => node.tableName === selectedTable)?.columns[0]?.columnName || '';
                            handleCreateTableColumnChange(index, 'referenceTable', selectedTable);
                            handleCreateTableColumnChange(index, 'referenceColumn', defaultRefColumn);
                          }}
                          className="col-span-3 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        >
                          <option value="">Reference table</option>
                          {erdData?.nodes.map((node) => (
                            <option key={node.tableName} value={node.tableName}>{node.tableName}</option>
                          ))}
                        </select>

                        <select
                          value={column.referenceColumn || ''}
                          onChange={(e) => handleCreateTableColumnChange(index, 'referenceColumn', e.target.value)}
                          className="col-span-3 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          disabled={!column.referenceTable}
                        >
                          <option value="">Reference column</option>
                          {(erdData?.nodes.find((node) => node.tableName === column.referenceTable)?.columns || []).map((refColumn) => (
                            <option key={`${column.referenceTable}-${refColumn.columnName}`} value={refColumn.columnName}>{refColumn.columnName}</option>
                          ))}
                        </select>

                        <select
                          value={column.relationType || 'one_to_many'}
                          onChange={(e) => handleCreateTableColumnChange(index, 'relationType', e.target.value)}
                          className="col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        >
                          <option value="one_to_many">1:N</option>
                          <option value="one_to_one">1:1</option>
                          <option value="many_to_many">N:N</option>
                        </select>
                      </>
                    )}

                    <div className="col-span-12 flex justify-end">
                      <button
                        onClick={() => handleRemoveCreateTableColumn(index)}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleAddCreateTableColumn}
                className="dm-btn-secondary"
              >
                Add Column
              </button>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsCreateTableOpen(false)}
                className="dm-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                className="dm-btn-primary"
              >
                Create Table
              </button>
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
                const selectedTypeOption = availableTypeOptions.find((option) => option.name.toLowerCase() === column.baseType.toLowerCase());
                const selectedTypeParams = selectedTypeOption?.parameters || [];
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
                    className="col-span-3 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />

                  <select
                    value={column.baseType}
                    onChange={(e) => handleColumnChange(index, 'baseType', e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    {availableColumnTypes.map((typeName) => (
                      <option key={typeName} value={typeName}>{typeName}</option>
                    ))}
                  </select>

                  <div className="col-span-3 flex flex-wrap gap-2">
                    {selectedTypeParams.length > 0 ? selectedTypeParams.map((parameter) => (
                      <input
                        key={`${column.baseType}-${parameter.key}-${index}`}
                        value={column.typeArgs[parameter.key] || ''}
                        onChange={(e) => handleColumnTypeArgChange(index, parameter.key, e.target.value)}
                        placeholder={parameter.label}
                        type={parameter.inputType === 'number' ? 'number' : 'text'}
                        className="min-w-[90px] flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    )) : (
                      <span className="text-xs text-slate-500 self-center">No arguments</span>
                    )}
                  </div>

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
                className="dm-btn-secondary"
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
                className="dm-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTableChanges}
                className="dm-btn-primary"
              >
                Apply to ER + DBML
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

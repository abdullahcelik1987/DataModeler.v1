export type ProjectEnvironment = 'Development' | 'Test' | 'Staging' | 'Production';

export type DbmlProjectMetadata = {
  databaseType: string;
  description: string;
  owner: string;
  ownerGroup?: string;
  version: string;
  lastUpdate: string;
  environment: ProjectEnvironment;
  contact: string;
  customFields: Record<string, string>;
};

export type ProjectMetadataFieldDefinition = {
  id?: string;
  fieldKey: string;
  displayName: string;
  fieldType: 'text' | 'textarea' | 'select' | string;
  isRequired: boolean;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  options: string[];
};

export type ParsedProjectMetadataResult = {
  projectName: string | null;
  metadata: DbmlProjectMetadata;
  hasProjectBlock: boolean;
};

const DEFAULT_METADATA: DbmlProjectMetadata = {
  databaseType: 'PostgreSQL',
  description: '',
  owner: '',
  ownerGroup: '',
  version: '1.0.0',
  lastUpdate: '',
  environment: 'Development',
  contact: '',
  customFields: {},
};

const SYSTEM_FIELD_MAP: Record<string, keyof Omit<DbmlProjectMetadata, 'customFields'>> = {
  database_type: 'databaseType',
  description: 'description',
  owner: 'owner',
  owner_group: 'ownerGroup',
  version: 'version',
  last_update: 'lastUpdate',
  environment: 'environment',
  contact: 'contact',
};

export const METADATA_SYSTEM_KEYS = Object.keys(SYSTEM_FIELD_MAP);

function normalizeFieldKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export function getMetadataFieldValue(metadata: DbmlProjectMetadata, fieldKey: string): string {
  const normalizedKey = normalizeFieldKey(fieldKey);
  const mapped = SYSTEM_FIELD_MAP[normalizedKey];
  if (mapped) {
    return String(metadata[mapped] || '');
  }
  return metadata.customFields[normalizedKey] || '';
}

export function setMetadataFieldValue(metadata: DbmlProjectMetadata, fieldKey: string, value: string): DbmlProjectMetadata {
  const normalizedKey = normalizeFieldKey(fieldKey);
  const mapped = SYSTEM_FIELD_MAP[normalizedKey];
  if (mapped) {
    return {
      ...metadata,
      [mapped]: value,
    };
  }

  return {
    ...metadata,
    customFields: {
      ...metadata.customFields,
      [normalizedKey]: value,
    },
  };
}

export function sanitizeMetadataByDefinitions(metadata: DbmlProjectMetadata, definitions: ProjectMetadataFieldDefinition[]): DbmlProjectMetadata {
  const activeFieldKeys = new Set(
    definitions
      .filter((field) => field.isActive)
      .map((field) => normalizeFieldKey(field.fieldKey))
  );

  const sanitizedCustomFields: Record<string, string> = {};
  Object.entries(metadata.customFields || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeFieldKey(key);
    if (activeFieldKeys.has(normalizedKey)) {
      sanitizedCustomFields[normalizedKey] = value;
    }
  });

  return {
    ...metadata,
    customFields: sanitizedCustomFields,
  };
}

export function toProjectMetadataPayload(metadata: DbmlProjectMetadata): Record<string, string> {
  const payload: Record<string, string> = {};

  Object.entries(SYSTEM_FIELD_MAP).forEach(([fieldKey, modelKey]) => {
    const value = String(metadata[modelKey] || '').trim();
    if (value.length > 0) {
      payload[fieldKey] = value;
    }
  });

  Object.entries(metadata.customFields || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeFieldKey(key);
    const normalizedValue = (value || '').trim();
    if (!normalizedKey || !normalizedValue || SYSTEM_FIELD_MAP[normalizedKey] || normalizedKey === 'business_domain') {
      return;
    }

    payload[normalizedKey] = normalizedValue;
  });

  return payload;
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "\\'");
}

function unescapeSingleQuotes(value: string): string {
  return value.replace(/\\'/g, "'");
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function findProjectBlockRange(dbml: string): { start: number; end: number; name: string; body: string } | null {
  const headerMatch = /(^|\n)\s*Project\s+"([^"]+)"\s*\{/m.exec(dbml);
  if (!headerMatch || headerMatch.index === undefined) {
    return null;
  }

  const headerStart = headerMatch.index + (headerMatch[1] ? headerMatch[1].length : 0);
  const projectName = headerMatch[2];
  const openingBraceIndex = dbml.indexOf('{', headerStart);
  if (openingBraceIndex === -1) {
    return null;
  }

  let depth = 0;
  let inSingleQuote = false;
  let inTripleQuote = false;

  for (let i = openingBraceIndex; i < dbml.length; i += 1) {
    const nextThree = dbml.slice(i, i + 3);

    if (!inSingleQuote && nextThree === "'''") {
      inTripleQuote = !inTripleQuote;
      i += 2;
      continue;
    }

    if (!inTripleQuote && dbml[i] === "'" && dbml[i - 1] !== '\\') {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (inSingleQuote || inTripleQuote) {
      continue;
    }

    if (dbml[i] === '{') {
      depth += 1;
    } else if (dbml[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          start: headerStart,
          end: i,
          name: projectName,
          body: dbml.slice(openingBraceIndex + 1, i),
        };
      }
    }
  }

  return null;
}

function readField(body: string, key: string): string {
  const fieldPattern = new RegExp(`${key}\\s*:\\s*'([^']*)'`, 'i');
  const match = fieldPattern.exec(body);
  if (!match) return '';
  return unescapeSingleQuotes(match[1].trim());
}

export function parseProjectMetadata(dbml: string): ParsedProjectMetadataResult {
  const block = findProjectBlockRange(dbml);
  if (!block) {
    return {
      projectName: null,
      metadata: { ...DEFAULT_METADATA },
      hasProjectBlock: false,
    };
  }

  const descriptionMatch = /description\s*:\s*'''([\s\S]*?)'''/i.exec(block.body);

  const metadata: DbmlProjectMetadata = {
    databaseType: readField(block.body, 'database_type') || DEFAULT_METADATA.databaseType,
    description: descriptionMatch ? descriptionMatch[1].trim() : '',
    owner: readField(block.body, 'owner'),
    ownerGroup: readField(block.body, 'owner_group'),
    version: readField(block.body, 'version') || DEFAULT_METADATA.version,
    lastUpdate: readField(block.body, 'last_update'),
    environment: (readField(block.body, 'environment') || DEFAULT_METADATA.environment) as ProjectEnvironment,
    contact: readField(block.body, 'contact'),
    customFields: {},
  };

  const keyValueRegex = /^\s*([a-zA-Z0-9_]+)\s*:\s*'([^']*)'\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = keyValueRegex.exec(block.body)) !== null) {
    const rawKey = normalizeFieldKey(match[1]);
    if (!rawKey || SYSTEM_FIELD_MAP[rawKey] || rawKey === 'business_domain') {
      continue;
    }

    metadata.customFields[rawKey] = unescapeSingleQuotes(match[2].trim());
  }

  return {
    projectName: block.name,
    metadata,
    hasProjectBlock: true,
  };
}

export function buildProjectBlock(projectName: string, metadata: DbmlProjectMetadata): string {
  const lines: string[] = [
    `Project "${projectName}" {`,
    `  database_type: '${escapeSingleQuotes(metadata.databaseType)}'`,
  ];

  if (metadata.description.trim().length > 0) {
    lines.push("  description: '''");
    for (const row of metadata.description.trim().split(/\r?\n/)) {
      lines.push(`    ${row}`);
    }
    lines.push("  '''");
  }

  if (metadata.owner.trim().length > 0) lines.push(`  owner: '${escapeSingleQuotes(metadata.owner.trim())}'`);
  if ((metadata.ownerGroup || '').trim().length > 0) lines.push(`  owner_group: '${escapeSingleQuotes((metadata.ownerGroup || '').trim())}'`);
  if (metadata.version.trim().length > 0) lines.push(`  version: '${escapeSingleQuotes(metadata.version.trim())}'`);
  if (metadata.lastUpdate.trim().length > 0) lines.push(`  last_update: '${escapeSingleQuotes(metadata.lastUpdate.trim())}'`);
  if (metadata.environment.trim().length > 0) lines.push(`  environment: '${escapeSingleQuotes(metadata.environment.trim())}'`);
  if (metadata.contact.trim().length > 0) lines.push(`  contact: '${escapeSingleQuotes(metadata.contact.trim())}'`);

  const customEntries = Object.entries(metadata.customFields || {})
    .map(([key, value]) => ({ key: normalizeFieldKey(key), value: (value || '').trim() }))
    .filter(({ key, value }) => key.length > 0 && value.length > 0 && !SYSTEM_FIELD_MAP[key] && key !== 'business_domain')
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: 'base' }));

  customEntries.forEach(({ key, value }) => {
    lines.push(`  ${key}: '${escapeSingleQuotes(value)}'`);
  });

  lines.push('}');
  return lines.join('\n');
}

export function upsertProjectBlock(dbml: string, projectName: string, metadata: DbmlProjectMetadata): string {
  const projectBlock = buildProjectBlock(projectName, metadata);
  const existing = findProjectBlockRange(dbml);

  if (!existing) {
    const trimmed = dbml.trim();
    return trimmed.length > 0 ? `${projectBlock}\n\n${trimmed}` : projectBlock;
  }

  const before = dbml.slice(0, existing.start).trimEnd();
  const after = dbml.slice(existing.end + 1).trimStart();

  if (!before && !after) return projectBlock;
  if (!before) return `${projectBlock}\n\n${after}`;
  if (!after) return `${before}\n\n${projectBlock}`;
  return `${before}\n\n${projectBlock}\n\n${after}`;
}

export function createDefaultProjectMetadata(overrides?: Partial<DbmlProjectMetadata>): DbmlProjectMetadata {
  const nextCustom = overrides?.customFields || {};
  return {
    ...DEFAULT_METADATA,
    lastUpdate: getTodayIsoDate(),
    ...overrides,
    customFields: { ...DEFAULT_METADATA.customFields, ...nextCustom },
  };
}

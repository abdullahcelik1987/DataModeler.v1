export type ProjectEnvironment = 'Development' | 'Test' | 'Staging' | 'Production';

export type DbmlProjectMetadata = {
  databaseType: string;
  description: string;
  owner: string;
  version: string;
  lastUpdate: string;
  environment: ProjectEnvironment;
  contact: string;
  businessDomain: string;
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
  version: '1.0.0',
  lastUpdate: '',
  environment: 'Development',
  contact: '',
  businessDomain: '',
};

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
    version: readField(block.body, 'version') || DEFAULT_METADATA.version,
    lastUpdate: readField(block.body, 'last_update'),
    environment: (readField(block.body, 'environment') || DEFAULT_METADATA.environment) as ProjectEnvironment,
    contact: readField(block.body, 'contact'),
    businessDomain: readField(block.body, 'business_domain'),
  };

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
  if (metadata.version.trim().length > 0) lines.push(`  version: '${escapeSingleQuotes(metadata.version.trim())}'`);
  if (metadata.lastUpdate.trim().length > 0) lines.push(`  last_update: '${escapeSingleQuotes(metadata.lastUpdate.trim())}'`);
  if (metadata.environment.trim().length > 0) lines.push(`  environment: '${escapeSingleQuotes(metadata.environment.trim())}'`);
  if (metadata.contact.trim().length > 0) lines.push(`  contact: '${escapeSingleQuotes(metadata.contact.trim())}'`);
  if (metadata.businessDomain.trim().length > 0) lines.push(`  business_domain: '${escapeSingleQuotes(metadata.businessDomain.trim())}'`);

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
  return {
    ...DEFAULT_METADATA,
    lastUpdate: getTodayIsoDate(),
    ...overrides,
  };
}

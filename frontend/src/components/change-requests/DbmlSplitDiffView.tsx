'use client';

import { useMemo } from 'react';

type DiffKind = 'unchanged' | 'removed' | 'added' | 'changed' | 'empty';

type DiffRow = {
  leftLineNumber: number | null;
  rightLineNumber: number | null;
  leftText: string;
  rightText: string;
  leftKind: DiffKind;
  rightKind: DiffKind;
};

type Operation =
  | { type: 'equal'; oldIndex: number; newIndex: number }
  | { type: 'delete'; oldIndex: number }
  | { type: 'insert'; newIndex: number };

type Props = {
  oldDbml: string;
  newDbml: string;
};

function buildLcsMatrix(oldLines: string[], newLines: string[]): number[][] {
  const rows = oldLines.length;
  const cols = newLines.length;
  const matrix = Array.from({ length: rows + 1 }, () => Array<number>(cols + 1).fill(0));

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        matrix[i][j] = matrix[i + 1][j + 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  return matrix;
}

function buildOperations(oldLines: string[], newLines: string[]): Operation[] {
  const matrix = buildLcsMatrix(oldLines, newLines);
  const operations: Operation[] = [];

  let i = 0;
  let j = 0;

  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      operations.push({ type: 'equal', oldIndex: i, newIndex: j });
      i += 1;
      j += 1;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      operations.push({ type: 'delete', oldIndex: i });
      i += 1;
    } else {
      operations.push({ type: 'insert', newIndex: j });
      j += 1;
    }
  }

  while (i < oldLines.length) {
    operations.push({ type: 'delete', oldIndex: i });
    i += 1;
  }

  while (j < newLines.length) {
    operations.push({ type: 'insert', newIndex: j });
    j += 1;
  }

  return operations;
}

function pushChangedRows(
  rows: DiffRow[],
  oldLines: string[],
  newLines: string[],
  deletedIndexes: number[],
  insertedIndexes: number[]
): void {
  const pairCount = Math.min(deletedIndexes.length, insertedIndexes.length);

  for (let k = 0; k < pairCount; k += 1) {
    const oldIndex = deletedIndexes[k];
    const newIndex = insertedIndexes[k];
    rows.push({
      leftLineNumber: oldIndex + 1,
      rightLineNumber: newIndex + 1,
      leftText: oldLines[oldIndex],
      rightText: newLines[newIndex],
      leftKind: 'changed',
      rightKind: 'changed',
    });
  }

  for (let k = pairCount; k < deletedIndexes.length; k += 1) {
    const oldIndex = deletedIndexes[k];
    rows.push({
      leftLineNumber: oldIndex + 1,
      rightLineNumber: null,
      leftText: oldLines[oldIndex],
      rightText: '',
      leftKind: 'removed',
      rightKind: 'empty',
    });
  }

  for (let k = pairCount; k < insertedIndexes.length; k += 1) {
    const newIndex = insertedIndexes[k];
    rows.push({
      leftLineNumber: null,
      rightLineNumber: newIndex + 1,
      leftText: '',
      rightText: newLines[newIndex],
      leftKind: 'empty',
      rightKind: 'added',
    });
  }
}

function createRows(oldDbml: string, newDbml: string): DiffRow[] {
  const oldLines = oldDbml.split('\n');
  const newLines = newDbml.split('\n');
  const operations = buildOperations(oldLines, newLines);

  const rows: DiffRow[] = [];
  let index = 0;

  while (index < operations.length) {
    const current = operations[index];

    if (current.type === 'equal') {
      rows.push({
        leftLineNumber: current.oldIndex + 1,
        rightLineNumber: current.newIndex + 1,
        leftText: oldLines[current.oldIndex],
        rightText: newLines[current.newIndex],
        leftKind: 'unchanged',
        rightKind: 'unchanged',
      });
      index += 1;
      continue;
    }

    if (current.type === 'delete' || current.type === 'insert') {
      const deletedIndexes: number[] = [];
      const insertedIndexes: number[] = [];

      while (index < operations.length) {
        const op = operations[index];
        if (op.type === 'equal') {
          break;
        }

        if (op.type === 'delete') {
          deletedIndexes.push(op.oldIndex);
        } else {
          insertedIndexes.push(op.newIndex);
        }

        index += 1;
      }

      if (deletedIndexes.length > 0 && insertedIndexes.length > 0) {
        pushChangedRows(rows, oldLines, newLines, deletedIndexes, insertedIndexes);
      } else if (deletedIndexes.length > 0) {
        deletedIndexes.forEach((oldIndex) => {
          rows.push({
            leftLineNumber: oldIndex + 1,
            rightLineNumber: null,
            leftText: oldLines[oldIndex],
            rightText: '',
            leftKind: 'removed',
            rightKind: 'empty',
          });
        });
      } else {
        insertedIndexes.forEach((newIndex) => {
          rows.push({
            leftLineNumber: null,
            rightLineNumber: newIndex + 1,
            leftText: '',
            rightText: newLines[newIndex],
            leftKind: 'empty',
            rightKind: 'added',
          });
        });
      }
    }
  }

  return rows;
}

function colorClass(kind: DiffKind): string {
  switch (kind) {
    case 'removed':
      return 'bg-red-100';
    case 'added':
      return 'bg-green-100';
    case 'changed':
      return 'bg-yellow-100';
    case 'unchanged':
      return 'bg-white';
    default:
      return 'bg-slate-50';
  }
}

function lineNumberClass(kind: DiffKind): string {
  switch (kind) {
    case 'removed':
      return 'text-red-700';
    case 'added':
      return 'text-green-700';
    case 'changed':
      return 'text-yellow-800';
    case 'unchanged':
      return 'text-slate-500';
    default:
      return 'text-slate-400';
  }
}

function LineCell({ lineNumber, text, kind }: { lineNumber: number | null; text: string; kind: DiffKind }) {
  return (
    <div className={`flex min-h-7 items-stretch border-b border-slate-100 ${colorClass(kind)}`}>
      <div className={`w-14 shrink-0 border-r border-slate-200 px-2 py-1 text-right font-mono text-xs ${lineNumberClass(kind)}`}>
        {lineNumber ?? ''}
      </div>
      <pre className="m-0 flex-1 overflow-x-auto px-3 py-1 font-mono text-xs leading-5 text-slate-900 whitespace-pre-wrap break-words">
        {text || ' '}
      </pre>
    </div>
  );
}

export default function DbmlSplitDiffView({ oldDbml, newDbml }: Props) {
  const rows = useMemo(() => createRows(oldDbml || '', newDbml || ''), [oldDbml, newDbml]);

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-red-100" />Silinen</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-yellow-100" />Degisen</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-green-100" />Eklenen</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-white border border-slate-300" />Ayni</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="border-r-0 lg:border-r border-slate-200">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Eski DBML
          </div>
          <div className="max-h-[560px] overflow-auto">
            {rows.map((row, idx) => (
              <LineCell key={`left-${idx}-${row.leftLineNumber ?? 'x'}`} lineNumber={row.leftLineNumber} text={row.leftText} kind={row.leftKind} />
            ))}
          </div>
        </div>

        <div>
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Yeni DBML
          </div>
          <div className="max-h-[560px] overflow-auto">
            {rows.map((row, idx) => (
              <LineCell key={`right-${idx}-${row.rightLineNumber ?? 'x'}`} lineNumber={row.rightLineNumber} text={row.rightText} kind={row.rightKind} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

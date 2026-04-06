'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  NodeChange,
  NodeProps,
  ReactFlowInstance,
  Position,
  Handle,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  applyNodeChanges,
  NodeResizer,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DbmlTableNodeDto, DbmlRelationshipDto } from '@/src/types/dbml';

interface ErDiagramProps {
  tables: DbmlTableNodeDto[];
  relationships: DbmlRelationshipDto[];
  onNodesChange?: (nodes: Node[]) => void;
  onEditTable?: (tableName: string) => void;
  readOnly?: boolean;
  className?: string;
  focusTableName?: string;
  focusNonce?: number;
}

type TableNodeData = {
  table: DbmlTableNodeDto;
  readOnly: boolean;
  compact: boolean;
  maxVisibleColumns: number;
  isSelected: boolean;
  isNeighbor: boolean;
  isDimmed: boolean;
  fkColumns: string[];
  relationTargetColumns: string[];
  relationRole: 'fk' | 'pk' | null;
  relationFocusFkColumn?: string;
  relationFocusPkColumn?: string;
};

type SelectedRelation = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

const DEFAULT_NODE_WIDTH = 260;
const MIN_NODE_HEIGHT = 150;
const MAX_NODE_HEIGHT = 360;
const HEADER_HEIGHT = 48;
const HIGH_DENSITY_ENTITY_THRESHOLD = 250;
const ROW_HEIGHT = 32;

function toHandleSafeId(columnName: string) {
  return columnName.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getInitialNodeHeight(columnCount: number, compact: boolean) {
  const rowHeight = compact ? 26 : 30;
  return Math.min(MAX_NODE_HEIGHT, Math.max(MIN_NODE_HEIGHT, HEADER_HEIGHT + columnCount * rowHeight + 18));
}

function getRelationLabel(relationType: DbmlRelationshipDto['relationType']) {
  if (relationType === 'one_to_one') return '1:1';
  if (relationType === 'many_to_many') return 'N:N';
  return '1:N';
}

function getLabelBgColor(relationType: DbmlRelationshipDto['relationType']) {
  if (relationType === 'one_to_one') return '#faf5ff';
  if (relationType === 'many_to_many') return '#fdf4ff';
  return '#f0fdf4';
}

function getLabelTextColor(relationType: DbmlRelationshipDto['relationType']) {
  if (relationType === 'one_to_one') return '#7c3aed';
  if (relationType === 'many_to_many') return '#a21caf';
  return '#15803d';
}

function TableNode({ data, selected }: NodeProps<TableNodeData>) {
  const columnCount = data.table.columns.length;
  const fkColumnSet = new Set(data.fkColumns);
  const relationTargetSet = new Set(data.relationTargetColumns);
  const visibleColumns = selected
    ? data.table.columns.slice(0, data.maxVisibleColumns)
    : data.table.columns.slice(0, Math.min(8, data.maxVisibleColumns));
  const hiddenColumnCount = Math.max(0, data.table.columns.length - visibleColumns.length);

  const isPrimaryHighlight = data.isSelected;
  const isSecondaryHighlight = data.isNeighbor;
  const isRelationFkNode = data.relationRole === 'fk';
  const isRelationPkNode = data.relationRole === 'pk';

  return (
    <div
      className={`relative h-full overflow-hidden rounded-lg border bg-white transition-all duration-150 ${
        data.isDimmed
          ? 'border-slate-200 opacity-45 saturate-50'
          : isRelationFkNode
            ? 'border-cyan-500 ring-2 ring-cyan-300 shadow-[0_14px_30px_rgba(6,182,212,0.18)]'
            : isRelationPkNode
              ? 'border-amber-500 ring-2 ring-amber-300 shadow-[0_14px_30px_rgba(245,158,11,0.18)]'
              : isPrimaryHighlight
                ? 'border-cyan-500 ring-2 ring-cyan-300 shadow-[0_14px_30px_rgba(6,182,212,0.18)]'
                : isSecondaryHighlight
                  ? 'border-teal-300 ring-1 ring-teal-200 shadow-[0_10px_20px_rgba(20,184,166,0.14)]'
                  : data.compact
                    ? 'border-slate-200 shadow-sm'
                    : 'border-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        style={{ left: -4 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        style={{ right: -4 }}
      />

      <NodeResizer
        isVisible={selected && !data.readOnly}
        minWidth={220}
        minHeight={MIN_NODE_HEIGHT}
        maxWidth={460}
        maxHeight={560}
        keepAspectRatio={false}
        lineStyle={{ borderColor: '#0f766e', borderWidth: 2 }}
        handleStyle={{ width: 8, height: 8, background: '#0f766e', border: '2px solid #fff' }}
      />

      {data.table.columns.map((column, index) => {
        const handleTop = HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
        const safeId = toHandleSafeId(column.columnName);
        return (
          <React.Fragment key={`${data.table.tableName}-${column.columnName}-handles`}>
            <Handle
              type="target"
              position={Position.Left}
              id={`tgt-${safeId}`}
              className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
              style={{ left: -4, top: handleTop }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id={`src-${safeId}`}
              className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
              style={{ right: -4, top: handleTop }}
            />
          </React.Fragment>
        );
      })}

      <div
        className={`border-b border-slate-200 px-3 py-2 text-white ${
          isRelationFkNode
            ? 'bg-gradient-to-r from-cyan-900 via-cyan-700 to-teal-500'
            : isRelationPkNode
              ? 'bg-gradient-to-r from-amber-900 via-amber-700 to-orange-500'
              : isPrimaryHighlight
                ? 'bg-gradient-to-r from-cyan-900 via-cyan-700 to-teal-500'
                : isSecondaryHighlight
                  ? 'bg-gradient-to-r from-slate-900 via-teal-700 to-emerald-600'
                  : 'bg-gradient-to-r from-slate-900 via-cyan-800 to-teal-600'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-wide">{data.table.tableName}</div>
            <div className="mt-0.5 text-[10px] text-cyan-100">{columnCount} attributes</div>
          </div>
        </div>
      </div>

      <div className="h-[calc(100%-48px)] overflow-auto bg-white">
        {data.table.columns.length === 0 ? (
          <div className="px-3 py-3 text-xs text-slate-500">No attributes</div>
        ) : (
          visibleColumns.map((column) => (
            (() => {
              const isFk = fkColumnSet.has(column.columnName);
              const isPkRelationTarget = relationTargetSet.has(column.columnName);
              const isFocusedFkColumn = data.relationFocusFkColumn === column.columnName;
              const isFocusedPkColumn = data.relationFocusPkColumn === column.columnName;

              return (
            <div
              key={`${data.table.tableName}-${column.columnName}`}
              className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0 ${
                isFocusedFkColumn
                  ? 'bg-cyan-200/80 hover:bg-cyan-300/70'
                  : isFocusedPkColumn
                    ? 'bg-amber-200/80 hover:bg-amber-300/70'
                    : isFk
                      ? 'bg-cyan-50/80 hover:bg-cyan-100/60'
                      : isPkRelationTarget
                        ? 'bg-amber-50/80 hover:bg-amber-100/60'
                        : 'hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {column.isPrimaryKey && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    PK
                  </span>
                )}
                {isFk && (
                  <span className="inline-flex items-center rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700">
                    FK
                  </span>
                )}
                {isFocusedPkColumn && !column.isPrimaryKey && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    REF
                  </span>
                )}
                {column.isNotNull && !column.isPrimaryKey && (
                  <span className="inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    NN
                  </span>
                )}
                <span className="truncate text-[11px] font-medium text-slate-800">{column.columnName}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 pt-0.5">:</span>
              <span className="truncate text-[11px] font-mono leading-5 text-slate-500" title={column.columnType}>
                {column.columnType}
              </span>
            </div>
              );
            })()
          ))
        )}
        {hiddenColumnCount > 0 && (
          <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-medium text-slate-500">
            + {hiddenColumnCount} more attributes
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { tableNode: TableNode };

export function ErDiagram({ tables, relationships, onNodesChange, onEditTable, readOnly = false, className, focusTableName, focusNonce }: ErDiagramProps) {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<SelectedRelation | null>(null);
  const highDensityMode = tables.length >= HIGH_DENSITY_ENTITY_THRESHOLD;
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  const fkColumnsByTable = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const rel of relationships) {
      if (!map.has(rel.fromTable)) map.set(rel.fromTable, new Set<string>());
      map.get(rel.fromTable)?.add(rel.fromColumn);
    }
    return map;
  }, [relationships]);

  const relationTargetsByTable = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const rel of relationships) {
      if (!map.has(rel.toTable)) map.set(rel.toTable, new Set<string>());
      map.get(rel.toTable)?.add(rel.toColumn);
    }
    return map;
  }, [relationships]);

  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const rel of relationships) {
      if (!map.has(rel.fromTable)) map.set(rel.fromTable, new Set<string>());
      if (!map.has(rel.toTable)) map.set(rel.toTable, new Set<string>());
      map.get(rel.fromTable)?.add(rel.toTable);
      map.get(rel.toTable)?.add(rel.fromTable);
    }

    return map;
  }, [relationships]);

  const selectedNeighbors = useMemo(() => {
    if (!selectedTableId) return new Set<string>();
    return new Set(adjacencyMap.get(selectedTableId) ?? []);
  }, [selectedTableId, adjacencyMap]);

  useEffect(() => {
    const tableNameSet = new Set(tables.map((table) => table.tableName));

    setNodes((currentNodes) => {
      const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node]));
      const layoutColumns = highDensityMode ? 8 : 4;

      return tables.map((table, index) => {
        const existingNode = currentNodeMap.get(table.tableName);
        const existingStyle = (existingNode?.style as Record<string, unknown> | undefined) ?? {};
        const defaultWidth = highDensityMode ? 230 : DEFAULT_NODE_WIDTH;
        const preservedWidth = typeof existingStyle.width === 'number' ? existingStyle.width : defaultWidth;
        const preservedHeight = typeof existingStyle.height === 'number'
          ? existingStyle.height
          : getInitialNodeHeight(table.columns.length, highDensityMode);

        return {
          id: table.tableName,
          type: 'tableNode',
          data: {
            table,
            readOnly,
            compact: highDensityMode,
            maxVisibleColumns: highDensityMode ? 24 : 80,
            isSelected: !selectedRelation && selectedTableId === table.tableName,
            isNeighbor: !selectedRelation && selectedNeighbors.has(table.tableName),
            isDimmed: selectedRelation
              ? selectedRelation.fromTable !== table.tableName && selectedRelation.toTable !== table.tableName
              : (!!selectedTableId && selectedTableId !== table.tableName && !selectedNeighbors.has(table.tableName)),
            fkColumns: Array.from(fkColumnsByTable.get(table.tableName) ?? []),
            relationTargetColumns: Array.from(relationTargetsByTable.get(table.tableName) ?? []),
            relationRole: selectedRelation
              ? (selectedRelation.fromTable === table.tableName ? 'fk' : (selectedRelation.toTable === table.tableName ? 'pk' : null))
              : null,
            relationFocusFkColumn: selectedRelation?.fromTable === table.tableName ? selectedRelation.fromColumn : undefined,
            relationFocusPkColumn: selectedRelation?.toTable === table.tableName ? selectedRelation.toColumn : undefined,
          },
          position: existingNode?.position ?? { x: (index % layoutColumns) * 300, y: Math.floor(index / layoutColumns) * 220 },
          draggable: !readOnly,
          style: {
            width: preservedWidth,
            height: preservedHeight,
          },
        } as Node;
      });
    });

    const newEdges: Edge[] = relationships
      .filter((rel) => tableNameSet.has(rel.fromTable) && tableNameSet.has(rel.toTable))
      .map((rel, index) => ({
        id: `${rel.fromTable}-${rel.fromColumn}-${rel.toTable}-${rel.toColumn}-${index}`,
        data: {
          fromTable: rel.fromTable,
          fromColumn: rel.fromColumn,
          toTable: rel.toTable,
          toColumn: rel.toColumn,
        },
        source: rel.fromTable,
        target: rel.toTable,
        sourceHandle: highDensityMode ? 'right-source' : `src-${toHandleSafeId(rel.fromColumn)}`,
        targetHandle: highDensityMode ? 'left-target' : `tgt-${toHandleSafeId(rel.toColumn)}`,
        label: getRelationLabel(rel.relationType),
        type: 'smoothstep',
        animated: !highDensityMode && rel.relationType === 'many_to_many',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: highDensityMode ? 10 : 16,
          height: highDensityMode ? 10 : 16,
          color: highDensityMode ? '#334155' : '#0f766e'
        },
        style: {
          stroke: selectedRelation
            ? (selectedRelation.fromTable === rel.fromTable && selectedRelation.fromColumn === rel.fromColumn && selectedRelation.toTable === rel.toTable && selectedRelation.toColumn === rel.toColumn
                ? '#0891b2'
                : '#94a3b8')
            : !selectedTableId
            ? (highDensityMode ? '#475569' : '#0f766e')
            : (rel.fromTable === selectedTableId || rel.toTable === selectedTableId
                ? '#0ea5a5'
                : '#94a3b8'),
          strokeWidth: selectedRelation
            ? (selectedRelation.fromTable === rel.fromTable && selectedRelation.fromColumn === rel.fromColumn && selectedRelation.toTable === rel.toTable && selectedRelation.toColumn === rel.toColumn ? 3.2 : 1)
            : !selectedTableId
            ? (highDensityMode ? 1.25 : 2)
            : (rel.fromTable === selectedTableId || rel.toTable === selectedTableId ? 2.6 : 1),
          opacity: selectedRelation
            ? (selectedRelation.fromTable === rel.fromTable && selectedRelation.fromColumn === rel.fromColumn && selectedRelation.toTable === rel.toTable && selectedRelation.toColumn === rel.toColumn ? 1 : 0.2)
            : !selectedTableId
            ? (highDensityMode ? 0.62 : 0.9)
            : (rel.fromTable === selectedTableId || rel.toTable === selectedTableId ? 1 : 0.25),
        },
        labelStyle: {
          fill: selectedRelation
            ? (selectedRelation.fromTable === rel.fromTable && selectedRelation.fromColumn === rel.fromColumn && selectedRelation.toTable === rel.toTable && selectedRelation.toColumn === rel.toColumn
                ? getLabelTextColor(rel.relationType)
                : '#94a3b8')
            : (!selectedTableId || rel.fromTable === selectedTableId || rel.toTable === selectedTableId
                ? getLabelTextColor(rel.relationType)
                : '#94a3b8'),
          fontSize: highDensityMode ? 9 : 11,
          fontWeight: 700,
          opacity: selectedRelation
            ? (selectedRelation.fromTable === rel.fromTable && selectedRelation.fromColumn === rel.fromColumn && selectedRelation.toTable === rel.toTable && selectedRelation.toColumn === rel.toColumn ? 1 : 0.25)
            : (!selectedTableId || rel.fromTable === selectedTableId || rel.toTable === selectedTableId ? 1 : 0.4)
        },
        labelBgStyle: {
          fill: selectedRelation
            ? (selectedRelation.fromTable === rel.fromTable && selectedRelation.fromColumn === rel.fromColumn && selectedRelation.toTable === rel.toTable && selectedRelation.toColumn === rel.toColumn
                ? getLabelBgColor(rel.relationType)
                : '#f8fafc')
            : (!selectedTableId || rel.fromTable === selectedTableId || rel.toTable === selectedTableId
                ? getLabelBgColor(rel.relationType)
                : '#f8fafc'),
          opacity: selectedRelation
            ? (selectedRelation.fromTable === rel.fromTable && selectedRelation.fromColumn === rel.fromColumn && selectedRelation.toTable === rel.toTable && selectedRelation.toColumn === rel.toColumn ? 0.95 : 0.2)
            : (!selectedTableId || rel.fromTable === selectedTableId || rel.toTable === selectedTableId ? 0.92 : 0.3)
        },
        labelBgPadding: [5, 3],
        labelBgBorderRadius: 999,
      }));

    setEdges(newEdges);
  }, [tables, relationships, readOnly, setNodes, setEdges, highDensityMode, selectedTableId, selectedNeighbors, selectedRelation, fkColumnsByTable, relationTargetsByTable]);

  useEffect(() => {
    const focusName = focusTableName?.trim();
    if (!focusName) return;

    const exists = tables.some((table) => table.tableName === focusName);
    if (!exists) return;

    const neighborSet = new Set<string>();
    for (const relation of relationships) {
      if (relation.fromTable === focusName) neighborSet.add(relation.toTable);
      if (relation.toTable === focusName) neighborSet.add(relation.fromTable);
    }

    const primaryNodeIds = [focusName, ...Array.from(neighborSet).sort((a, b) => a.localeCompare(b))];
    const primaryNodeIdSet = new Set(primaryNodeIds);
    const primaryPositions = new Map<string, { x: number; y: number }>();
    primaryPositions.set(focusName, { x: 0, y: 0 });

    const neighbors = primaryNodeIds.slice(1);
    const radius = 360;
    neighbors.forEach((tableName, index) => {
      const angle = (index / Math.max(neighbors.length, 1)) * Math.PI * 2;
      primaryPositions.set(tableName, {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius),
      });
    });

    const secondaryNodes = tables
      .map((table) => table.tableName)
      .filter((tableName) => !primaryNodeIdSet.has(tableName))
      .sort((a, b) => a.localeCompare(b));

    const secondaryColumns = highDensityMode ? 7 : 5;
    const secondaryStartX = 860;
    const secondaryStartY = -420;
    const secondaryStepX = 300;
    const secondaryStepY = 220;
    const secondaryPositions = new Map<string, { x: number; y: number }>();
    secondaryNodes.forEach((tableName, index) => {
      secondaryPositions.set(tableName, {
        x: secondaryStartX + (index % secondaryColumns) * secondaryStepX,
        y: secondaryStartY + Math.floor(index / secondaryColumns) * secondaryStepY,
      });
    });

    setSelectedRelation(null);
    setSelectedTableId(focusName);

    setNodes((currentNodes) => currentNodes.map((node) => {
      const primaryPos = primaryPositions.get(node.id);
      if (primaryPos) {
        return { ...node, position: primaryPos };
      }

      const secondaryPos = secondaryPositions.get(node.id);
      if (secondaryPos) {
        return { ...node, position: secondaryPos };
      }

      return node;
    }));

    window.setTimeout(() => {
      const focusNode = reactFlowRef.current?.getNode?.(focusName);
      if (!focusNode) return;
      const nodeWidth = typeof focusNode.width === 'number' ? focusNode.width : DEFAULT_NODE_WIDTH;
      const nodeHeight = typeof focusNode.height === 'number' ? focusNode.height : MIN_NODE_HEIGHT;
      reactFlowRef.current?.setCenter?.(
        focusNode.position.x + nodeWidth / 2,
        focusNode.position.y + nodeHeight / 2,
        { zoom: highDensityMode ? 0.72 : 0.95, duration: 500 }
      );
    }, 100);
  }, [focusTableName, focusNonce, tables, relationships, highDensityMode, setNodes, reactFlowRef]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => {
        const updatedNodes = applyNodeChanges(changes, currentNodes);
        onNodesChange?.(updatedNodes);
        return updatedNodes;
      });
    },
    [setNodes, onNodesChange]
  );

  return (
    <div className={`${className ?? 'w-full h-[72vh] min-h-[620px]'} overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] shadow-sm`}>
      <ReactFlow
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={!readOnly ? handleNodesChange : undefined}
        onEdgesChange={!readOnly ? onEdgesChange : undefined}
        onNodeClick={(_, node) => {
          setSelectedRelation(null);
          setSelectedTableId(node.id);
        }}
        onEdgeClick={(_, edge) => {
          const relation = edge.data as SelectedRelation | undefined;
          if (!relation) return;
          setSelectedTableId(null);
          setSelectedRelation(relation);
        }}
        onNodeDoubleClick={(_, node) => onEditTable?.(node.id)}
        onPaneClick={() => {
          setSelectedTableId(null);
          setSelectedRelation(null);
        }}
        fitView
        nodesDraggable={!readOnly}
        elementsSelectable
        panOnDrag
        minZoom={0.12}
        maxZoom={1.8}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        connectionLineType={ConnectionLineType.SmoothStep}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements
        snapToGrid
        snapGrid={[16, 16]}
        fitViewOptions={{ padding: highDensityMode ? 0.05 : 0.12, minZoom: highDensityMode ? 0.14 : 0.25 }}
      >
        <Background color="#dbe4f0" gap={32} size={1} variant={BackgroundVariant.Lines} />
        <Background color="#b7c8dd" gap={16} size={1} variant={BackgroundVariant.Dots} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  MarkerType,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChangeRequestWorkflowStage, ChangeRequestApprovalLog } from '@/src/types/changeRequests';

interface WorkflowExplorerProps {
  stages: ChangeRequestWorkflowStage[];
  currentStageIndex: number;
  approvalLogs: ChangeRequestApprovalLog[];
  status: string;
}

interface StageNodeData {
  index: number;
  name: string;
  roleLabel: string;
  pendingStatus: string;
  state: 'completed' | 'current' | 'upcoming' | 'rejected';
  approverInfo?: string;
  approverEmail?: string;
  completedAt?: string;
  [key: string]: unknown;
}

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  domain_architect: { bg: '#ede9fe', border: '#7c3aed', text: '#5b21b6' },
  data_architect: { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8' },
  database_admin: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' },
  business_analyst: { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
  super_admin: { bg: '#ffedd5', border: '#ea580c', text: '#c2410c' },
};

const DEFAULT_ROLE_COLOR = { bg: '#f1f5f9', border: '#64748b', text: '#475569' };

function getRoleColor(role: string) {
  return ROLE_COLORS[role?.toLowerCase().replace(/\s+/g, '_')] ?? DEFAULT_ROLE_COLOR;
}

function StartNode() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-emerald-500 bg-emerald-50 shadow-md">
      <Handle id="source" type="source" position={Position.Right} className="!h-2 !w-2 !bg-emerald-500" />
      <span className="text-sm font-bold text-emerald-700">START</span>
    </div>
  );
}

function ApprovedTerminalNode() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-green-500 bg-green-50 shadow-md">
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-green-500" />
      <span className="text-xs font-bold text-green-700">✓</span>
    </div>
  );
}

function RejectedTerminalNode() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-red-500 bg-red-50 shadow-md">
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-red-500" />
      <span className="text-xs font-bold text-red-700">✕</span>
    </div>
  );
}

function ExplorerStageNode({ data }: NodeProps) {
  const stageData = data as unknown as StageNodeData;
  const color = getRoleColor(stageData.roleLabel.toLowerCase().replace(/\s+/g, '_'));

  const stateStyles = {
    completed: {
      border: '2px solid #16a34a',
      bg: 'bg-green-50',
      headerBg: '#dcfce7',
      headerText: '#15803d',
      badge: 'bg-green-100 text-green-700',
    },
    current: {
      border: '2px solid #2563eb',
      bg: 'bg-blue-50',
      headerBg: '#dbeafe',
      headerText: '#1d4ed8',
      badge: 'bg-blue-100 text-blue-700',
    },
    upcoming: {
      border: '2px solid #cbd5e1',
      bg: 'bg-slate-50',
      headerBg: '#f1f5f9',
      headerText: '#475569',
      badge: 'bg-slate-100 text-slate-700',
    },
    rejected: {
      border: '2px solid #dc2626',
      bg: 'bg-red-50',
      headerBg: '#fee2e2',
      headerText: '#991b1b',
      badge: 'bg-red-100 text-red-700',
    },
  };

  const style = stateStyles[stageData.state];

  return (
    <div className={`w-64 rounded-xl bg-white shadow-lg transition ${stageData.state === 'upcoming' ? 'opacity-75' : ''}`} style={{ border: style.border }}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2" style={{ background: style.headerText }} />

      <div className="rounded-t-xl px-3 py-2" style={{ background: style.headerBg }}>
        <div className="text-[10px] font-black tracking-wider" style={{ color: style.headerText }}>
          STAGE {stageData.index + 1}
        </div>
      </div>

      <div className="px-4 py-3">
        {/* Stage name */}
        <div className="text-sm font-bold text-slate-900">{stageData.name}</div>

        {/* Role */}
        <div className="mt-2 text-xs text-slate-600">{stageData.roleLabel}</div>

        {/* State indicator */}
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${style.badge}`}>
            {stageData.state === 'completed' && '✓ Tamamlandı'}
            {stageData.state === 'current' && '⏳ Onay Bekliyor'}
            {stageData.state === 'upcoming' && '◯ Beklemede'}
            {stageData.state === 'rejected' && '✕ Reddedildi'}
          </span>
        </div>

        {/* Approver info */}
        {stageData.approverEmail && (
          <div className="mt-3 rounded-lg bg-slate-50 p-2">
            <p className="text-[11px] text-slate-500">Onaylayan:</p>
            <p className="text-xs font-medium text-slate-800">{stageData.approverEmail}</p>
            {stageData.completedAt && <p className="mt-1 text-[10px] text-slate-500">{stageData.completedAt}</p>}
          </div>
        )}

        {stageData.state === 'current' && !stageData.approverEmail && (
          <div className="mt-3 rounded-lg bg-blue-50 p-2">
            <p className="text-[11px] text-blue-600">Onaylayabilir:</p>
            <p className="text-xs font-medium text-blue-700">{stageData.roleLabel} rolündeki kullanıcılar</p>
          </div>
        )}

        {/* Pending status code */}
        <div className="mt-2 rounded bg-slate-100 px-2 py-1 text-[10px] font-mono text-slate-600">
          {stageData.pendingStatus}
        </div>
      </div>

      <Handle
        id="approve"
        type="source"
        position={Position.Right}
        style={{ top: '60%', background: '#16a34a', width: 10, height: 10 }}
      />
      <Handle
        id="reject"
        type="source"
        position={Position.Right}
        style={{ top: '78%', background: '#dc2626', width: 10, height: 10 }}
      />
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  approved: ApprovedTerminalNode,
  rejected: RejectedTerminalNode,
  explorerStage: ExplorerStageNode,
};

function WorkflowExplorerInner({ stages, currentStageIndex, approvalLogs, status }: WorkflowExplorerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const normalizeStatus = (value: string | null | undefined) => (value || '').trim().toLowerCase();

  const latestRejectedLog = useMemo(() => {
    return approvalLogs
      .filter((log) => normalizeStatus(log.toStatus) === 'rejected')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [approvalLogs]);

  const rejectedStageIndex = useMemo(() => {
    if (normalizeStatus(status) !== 'rejected') {
      return -1;
    }

    const fromStatus = normalizeStatus(latestRejectedLog?.fromStatus || '');
    if (fromStatus) {
      const indexFromLog = stages.findIndex((stage) => normalizeStatus(stage.pendingStatus) === fromStatus);
      if (indexFromLog >= 0) {
        return indexFromLog;
      }
    }

    if (currentStageIndex >= 0 && currentStageIndex < stages.length) {
      return currentStageIndex;
    }

    return Math.max(stages.length - 1, 0);
  }, [stages, status, latestRejectedLog, currentStageIndex]);

  // Determine stage states based on current status and approval logs
  const getStageStates = useMemo(() => {
    const states: ('completed' | 'current' | 'upcoming' | 'rejected')[] = [];
    const normalizedCurrentStatus = normalizeStatus(status);

    for (let i = 0; i < stages.length; i++) {
      if (normalizedCurrentStatus === 'rejected') {
        if (i < rejectedStageIndex) {
          states[i] = 'completed';
        } else if (i === rejectedStageIndex) {
          states[i] = 'rejected';
        } else {
          states[i] = 'upcoming';
        }
      } else if (normalizedCurrentStatus === 'approved' || normalizedCurrentStatus === 'merged') {
        states[i] = 'completed';
      } else if (i < currentStageIndex) {
        states[i] = 'completed';
      } else if (i === currentStageIndex) {
        states[i] = 'current';
      } else {
        states[i] = 'upcoming';
      }
    }

    return states;
  }, [stages, currentStageIndex, status, rejectedStageIndex]);

  // Build graph nodes and edges
  useMemo(() => {
    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];

    // Start node
    graphNodes.push({
      id: 'start',
      type: 'start',
      position: { x: 40, y: 150 },
      data: {},
    });

    // Terminal nodes
    const terminalX = Math.max(280 * (stages.length + 1) + 80, 800);
    graphNodes.push({
      id: 'approved-terminal',
      type: 'approved',
      position: { x: terminalX, y: 80 },
      data: {},
    });

    graphNodes.push({
      id: 'rejected-terminal',
      type: 'rejected',
      position: { x: terminalX, y: 220 },
      data: {},
    });

    // Stage nodes
    stages.forEach((stage, i) => {
      const stageState = getStageStates[i];
      const approvalLog = approvalLogs.find((log) => log.toStatus?.includes(stage.pendingStatus));

      const nodeData: StageNodeData = {
        index: i,
        name: stage.name,
        roleLabel: stage.requiredRole,
        pendingStatus: stage.pendingStatus,
        state: stageState,
        approverEmail: approvalLog?.actorEmail,
        completedAt: approvalLog ? new Date(approvalLog.createdAt).toLocaleString() : undefined,
      };

      graphNodes.push({
        id: `stage-${i}`,
        type: 'explorerStage',
        position: { x: 180 + i * 280, y: 120 },
        data: nodeData,
      });
    });

    // Entry edge
    if (stages.length > 0) {
      graphEdges.push({
        id: 'entry',
        source: 'start',
        sourceHandle: 'source',
        target: 'stage-0',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        style: { stroke: '#64748b', strokeWidth: 2 },
      });
    }

    // Stage connection edges
    stages.forEach((stage, i) => {
      const approveTargetId = typeof stage.approveToStageIndex === 'number' && stage.approveToStageIndex >= 0 && stage.approveToStageIndex < stages.length
        ? `stage-${stage.approveToStageIndex}`
        : 'approved-terminal';

      const rejectTargetId = typeof stage.rejectToStageIndex === 'number' && stage.rejectToStageIndex >= 0 && stage.rejectToStageIndex < stages.length
        ? `stage-${stage.rejectToStageIndex}`
        : 'rejected-terminal';

      const isApproveOnPath = getStageStates[i] === 'completed' || getStageStates[i] === 'current';
      const isRejectedFromThisStage = normalizeStatus(status) === 'rejected' && i === rejectedStageIndex;

      graphEdges.push({
        id: `approve-${i}`,
        source: `stage-${i}`,
        sourceHandle: 'approve',
        target: approveTargetId,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#16a34a' },
        style: {
          stroke: '#16a34a',
          strokeWidth: isApproveOnPath && !isRejectedFromThisStage ? 2.5 : 1.5,
          opacity: isApproveOnPath && !isRejectedFromThisStage ? 1 : 0.35,
        },
      });

      graphEdges.push({
        id: `reject-${i}`,
        source: `stage-${i}`,
        sourceHandle: 'reject',
        target: rejectTargetId,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' },
        style: {
          stroke: '#dc2626',
          strokeWidth: isRejectedFromThisStage ? 2.5 : 1.5,
          opacity: isRejectedFromThisStage ? 1 : 0.35,
          strokeDasharray: '6 4',
        },
      });

      // Keep reject edge visually separate from approve edge.
      const rejectEdge = graphEdges[graphEdges.length - 1];
      rejectEdge.animated = isRejectedFromThisStage;
      rejectEdge.label = 'reject';

      const approveEdge = graphEdges[graphEdges.length - 2];
      approveEdge.label = 'approve';
      approveEdge.animated = isApproveOnPath && !isRejectedFromThisStage;
    });

    // Ensure the rejected terminal is visually reachable even when there is no stage.
    if (normalizeStatus(status) === 'rejected' && stages.length === 0) {
      graphEdges.push({
        id: 'entry-rejected',
        source: 'start',
        sourceHandle: 'source',
        target: 'rejected-terminal',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' },
        style: { stroke: '#dc2626', strokeWidth: 2.5, strokeDasharray: '6 4' },
      });
    }

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [stages, getStageStates, setNodes, setEdges, approvalLogs, status, rejectedStageIndex]);

  return (
    <div className="h-full w-full bg-gradient-to-br from-slate-50 to-slate-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={0.5} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function WorkflowExplorer(props: WorkflowExplorerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowExplorerInner {...props} />
    </ReactFlowProvider>
  );
}

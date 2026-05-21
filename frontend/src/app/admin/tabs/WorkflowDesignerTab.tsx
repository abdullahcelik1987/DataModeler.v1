'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  Connection,
  EdgeMouseHandler,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '').replace(/\/api$/, '');

interface WorkflowStage {
  name: string;
  requiredRole: string;
  pendingStatus: string;
  approveToStageIndex?: number | null;
  rejectToStageIndex?: number | null;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  stages: WorkflowStage[];
  isActive: boolean;
  updatedAt: string;
}

interface AppRole {
  id: string;
  name: string;
  displayName: string;
}

interface WorkflowDesignerTabProps {
  modelId?: string;
}

interface StageNodeData {
  index: number;
  name: string;
  roleLabel: string;
  pendingStatus: string;
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
  return ROLE_COLORS[role] ?? DEFAULT_ROLE_COLOR;
}

function StartNode() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-500 bg-emerald-50 shadow">
      <Handle id="approve" type="source" position={Position.Right} className="!h-3 !w-3 !bg-emerald-500" />
      <span className="text-lg font-bold text-emerald-700">S</span>
    </div>
  );
}

function ApprovedNode() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-green-500 bg-green-50 shadow">
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-green-500" />
      <span className="text-xs font-bold text-green-700">OK</span>
    </div>
  );
}

function RejectedNode() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-red-500 bg-red-50 shadow">
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-red-500" />
      <span className="text-[10px] font-bold text-red-700">REJ</span>
    </div>
  );
}

function StageNode({ data, selected }: NodeProps) {
  const stageData = data as unknown as StageNodeData;
  const color = getRoleColor(stageData.roleLabel.toLowerCase().replace(/\s+/g, '_'));

  return (
    <div
      className="w-56 rounded-xl bg-white shadow transition"
      style={{ border: selected ? '2px solid #2563eb' : `2px solid ${color.border}` }}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3" style={{ background: color.border }} />

      <div className="rounded-t-xl px-3 py-2" style={{ background: color.bg }}>
        <div className="text-[11px] font-black tracking-wider" style={{ color: color.text }}>
          STAGE {stageData.index + 1}
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="text-sm font-bold text-slate-900">{stageData.name}</div>
        <div className="mt-2 text-xs text-slate-600">{stageData.roleLabel}</div>
        <div className="mt-1 font-mono text-xs text-slate-500">{stageData.pendingStatus}</div>
      </div>

      <Handle
        id="approve"
        type="source"
        position={Position.Right}
        style={{ top: '38%', background: '#16a34a', width: 10, height: 10 }}
      />
      <Handle
        id="reject"
        type="source"
        position={Position.Right}
        style={{ top: '68%', background: '#dc2626', width: 10, height: 10 }}
      />
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  approved: ApprovedNode,
  rejected: RejectedNode,
  stage: StageNode,
};

function normalizeStages(input: WorkflowStage[]): WorkflowStage[] {
  return input
    .filter((x) => x.requiredRole && x.requiredRole.trim().length > 0)
    .map((stage, index, arr) => {
      const approveTarget = typeof stage.approveToStageIndex === 'number'
        ? stage.approveToStageIndex
        : index + 1 < arr.length
          ? index + 1
          : null;

      const sanitizedApprove = approveTarget !== null && approveTarget >= 0 && approveTarget < arr.length && approveTarget !== index
        ? approveTarget
        : null;

      const rejectTarget = typeof stage.rejectToStageIndex === 'number' ? stage.rejectToStageIndex : null;
      const sanitizedReject = rejectTarget !== null && rejectTarget >= 0 && rejectTarget < arr.length && rejectTarget !== index
        ? rejectTarget
        : null;

      return {
        name: stage.name?.trim() || `Stage ${index + 1}`,
        requiredRole: stage.requiredRole.trim(),
        pendingStatus: stage.pendingStatus?.trim() || `${stage.requiredRole}_pending`,
        approveToStageIndex: sanitizedApprove,
        rejectToStageIndex: sanitizedReject,
      };
    });
}

function WorkflowDesignerInner(_props: WorkflowDesignerTabProps) {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateName, setTemplateName] = useState('Custom Workflow');

  const [stages, setStages] = useState<WorkflowStage[]>([
    {
      name: 'Business Domain Architect',
      requiredRole: 'domain_architect',
      pendingStatus: 'Pending_Business',
      approveToStageIndex: 1,
      rejectToStageIndex: null,
    },
    {
      name: 'Data Architect',
      requiredRole: 'data_architect',
      pendingStatus: 'Pending_Architect',
      approveToStageIndex: null,
      rejectToStageIndex: 0,
    },
  ]);

  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);
  const [editStage, setEditStage] = useState<WorkflowStage | null>(null);
  const [newStage, setNewStage] = useState<WorkflowStage>({
    name: '',
    requiredRole: 'domain_architect',
    pendingStatus: '',
    approveToStageIndex: null,
    rejectToStageIndex: null,
  });

  const [statusMessage, setStatusMessage] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  const roleOptions = useMemo(
    () =>
      roles.length > 0
        ? roles.map((r) => ({ value: r.name, label: r.displayName }))
        : [
            { value: 'domain_architect', label: 'Domain Architect' },
            { value: 'data_architect', label: 'Data Architect' },
            { value: 'database_admin', label: 'Database Admin' },
            { value: 'business_analyst', label: 'Business Analyst' },
            { value: 'super_admin', label: 'Super Admin' },
          ],
    [roles],
  );

  const roleLabel = useCallback(
    (value: string) => roleOptions.find((r) => r.value === value)?.label ?? value,
    [roleOptions],
  );

  const buildGraph = useCallback(() => {
    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];

    const stageCount = stages.length;
    const farX = Math.max(320 * stageCount + 260, 860);

    const startNode: Node = {
      id: 'start',
      type: 'start',
      position: nodePositions.start ?? { x: 40, y: 180 },
      data: {},
      draggable: true,
    };

    const approvedNode: Node = {
      id: 'approved-terminal',
      type: 'approved',
      position: nodePositions['approved-terminal'] ?? { x: farX, y: 90 },
      data: {},
      draggable: true,
    };

    const rejectedNode: Node = {
      id: 'rejected-terminal',
      type: 'rejected',
      position: nodePositions['rejected-terminal'] ?? { x: farX, y: 290 },
      data: {},
      draggable: true,
    };

    graphNodes.push(startNode, approvedNode, rejectedNode);

    stages.forEach((stage, i) => {
      const nodeId = `stage-${i}`;
      graphNodes.push({
        id: nodeId,
        type: 'stage',
        position: nodePositions[nodeId] ?? { x: 260 + i * 320, y: 150 },
        data: {
          index: i,
          name: stage.name,
          roleLabel: roleLabel(stage.requiredRole),
          pendingStatus: stage.pendingStatus,
        },
        draggable: true,
      });
    });

    if (stages.length > 0) {
      graphEdges.push({
        id: 'entry-approve',
        source: 'start',
        sourceHandle: 'approve',
        target: 'stage-0',
        label: 'submit',
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      });
    }

    stages.forEach((stage, i) => {
      const sourceId = `stage-${i}`;
      const approveTarget = stage.approveToStageIndex;
      const rejectTarget = stage.rejectToStageIndex;

      graphEdges.push({
        id: `approve-${i}`,
        source: sourceId,
        sourceHandle: 'approve',
        target: typeof approveTarget === 'number' ? `stage-${approveTarget}` : 'approved-terminal',
        label: 'approve',
        style: { stroke: '#16a34a', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#16a34a' },
      });

      graphEdges.push({
        id: `reject-${i}`,
        source: sourceId,
        sourceHandle: 'reject',
        target: typeof rejectTarget === 'number' ? `stage-${rejectTarget}` : 'rejected-terminal',
        label: 'reject',
        style: { stroke: '#dc2626', strokeWidth: 2, strokeDasharray: '6 4' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' },
      });
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [nodePositions, roleLabel, setEdges, setNodes, stages]);

  useEffect(() => {
    buildGraph();
  }, [buildGraph]);

  const loadTemplates = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/workflow-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;

      const loadedTemplates: WorkflowTemplate[] = await response.json();
      if (!Array.isArray(loadedTemplates)) return;

      setTemplates(loadedTemplates);

      if (loadedTemplates.length > 0) {
        const active = loadedTemplates.find((x) => x.isActive) ?? loadedTemplates[0];
        setSelectedTemplateId(active.id);
        setTemplateName(active.name);
        if (Array.isArray(active.stages) && active.stages.length > 0) {
          setStages(normalizeStages(active.stages));
        }
      }
    } catch {
      setStatusMessage('Template listesi yuklenemedi.');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_URL}/api/authorization/app-roles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (Array.isArray(body?.data)) {
          setRoles(body.data as AppRole[]);
          if (body.data.length > 0) {
            setNewStage((prev) => ({ ...prev, requiredRole: body.data[0].name }));
          }
        }
      })
      .catch(() => {
        setStatusMessage('Rol listesi alinamadi. Varsayilan roller kullaniliyor.');
      });

    loadTemplates();
  }, [loadTemplates]);

  const handleTemplateSelection = async (id: string) => {
    setSelectedTemplateId(id);

    if (!id) {
      setTemplateName('Custom Workflow');
      return;
    }

    const selected = templates.find((t) => t.id === id);

    if (selected) {
      setTemplateName(selected.name);
      setStages(normalizeStages(selected.stages));
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`${API_URL}/api/admin/workflow-templates/${id}/activate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadTemplates();
      setStatusMessage('Secilen template aktif edildi.');
    } catch {
      setStatusMessage('Template aktivasyonu basarisiz.');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) {
      setStatusMessage('Silmek icin once bir sablon secin.');
      return;
    }

    const selected = templates.find((t) => t.id === selectedTemplateId);
    const templateLabel = selected?.name ?? 'secili sablon';
    const confirmed = window.confirm(`'${templateLabel}' sablonunu silmek istiyor musunuz?`);
    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setStatusMessage('Yetkilendirme token bulunamadi.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/workflow-templates/${selectedTemplateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Template silinemedi.');
      }

      setSelectedTemplateId('');
      setTemplateName('Custom Workflow');
      setStatusMessage('Template silindi.');
      await loadTemplates();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Template silme islemi basarisiz.');
    }
  };

  const handleNodeDragStop: NodeMouseHandler = (_evt, node) => {
    setNodePositions((prev) => ({
      ...prev,
      [node.id]: { x: node.position.x, y: node.position.y },
    }));
  };

  const handleNodeClick: NodeMouseHandler = (_evt, node) => {
    if (!node.id.startsWith('stage-')) return;
    const index = Number.parseInt(node.id.replace('stage-', ''), 10);
    if (Number.isNaN(index)) return;

    setSelectedStageIndex(index);
    setEditStage({ ...stages[index] });
  };

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle) return;

    if (!connection.source.startsWith('stage-')) {
      setStatusMessage('Sadece stage dugumlerinden baglanti tanimlanabilir.');
      return;
    }

    const sourceIndex = Number.parseInt(connection.source.replace('stage-', ''), 10);
    if (Number.isNaN(sourceIndex)) return;

    setStages((prev) => {
      const updated = [...prev];
      const current = { ...updated[sourceIndex] };

      const targetStageIndex = connection.target.startsWith('stage-')
        ? Number.parseInt(connection.target.replace('stage-', ''), 10)
        : null;

      if (connection.sourceHandle === 'approve') {
        current.approveToStageIndex = Number.isNaN(targetStageIndex as number) ? null : targetStageIndex;
      }

      if (connection.sourceHandle === 'reject') {
        current.rejectToStageIndex = Number.isNaN(targetStageIndex as number) ? null : targetStageIndex;
      }

      if (connection.target === 'approved-terminal' && connection.sourceHandle === 'approve') {
        current.approveToStageIndex = null;
      }

      if (connection.target === 'rejected-terminal' && connection.sourceHandle === 'reject') {
        current.rejectToStageIndex = null;
      }

      updated[sourceIndex] = current;
      return normalizeStages(updated);
    });

    setStatusMessage('Baglanti guncellendi.');
  }, []);

  const handleEdgeClick: EdgeMouseHandler = (_evt, edge) => {
    if (edge.id.startsWith('approve-')) {
      const idx = Number.parseInt(edge.id.replace('approve-', ''), 10);
      if (!Number.isNaN(idx)) {
        setStages((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], approveToStageIndex: null };
          return normalizeStages(updated);
        });
        setStatusMessage(`Stage ${idx + 1} approve gecisi temizlendi.`);
      }
      return;
    }

    if (edge.id.startsWith('reject-')) {
      const idx = Number.parseInt(edge.id.replace('reject-', ''), 10);
      if (!Number.isNaN(idx)) {
        setStages((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], rejectToStageIndex: null };
          return normalizeStages(updated);
        });
        setStatusMessage(`Stage ${idx + 1} reject gecisi temizlendi.`);
      }
    }
  };

  const handleAddStage = () => {
    if (!newStage.name.trim()) {
      setStatusMessage('Yeni stage icin ad zorunlu.');
      return;
    }

    if (!newStage.requiredRole.trim()) {
      setStatusMessage('Yeni stage icin rol zorunlu.');
      return;
    }

    setStages((prev) =>
      normalizeStages([
        ...prev,
        {
          name: newStage.name.trim(),
          requiredRole: newStage.requiredRole,
          pendingStatus: newStage.pendingStatus.trim() || `${newStage.requiredRole}_pending`,
          approveToStageIndex: null,
          rejectToStageIndex: null,
        },
      ]),
    );

    setNewStage({
      name: '',
      requiredRole: roleOptions[0]?.value ?? 'domain_architect',
      pendingStatus: '',
      approveToStageIndex: null,
      rejectToStageIndex: null,
    });

    setStatusMessage('Yeni stage eklendi.');
  };

  const handleDeleteStage = (index: number) => {
    setStages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);

      const remapped = filtered.map((stage) => {
        const remapIndex = (value: number | null | undefined) => {
          if (typeof value !== 'number') return null;
          if (value === index) return null;
          return value > index ? value - 1 : value;
        };

        return {
          ...stage,
          approveToStageIndex: remapIndex(stage.approveToStageIndex),
          rejectToStageIndex: remapIndex(stage.rejectToStageIndex),
        };
      });

      return normalizeStages(remapped);
    });

    setSelectedStageIndex(null);
    setEditStage(null);
    setStatusMessage(`Stage ${index + 1} silindi.`);
  };

  const handleSaveEditedStage = () => {
    if (selectedStageIndex === null || !editStage) return;

    setStages((prev) => {
      const updated = [...prev];
      updated[selectedStageIndex] = {
        ...editStage,
        name: editStage.name.trim(),
        pendingStatus: editStage.pendingStatus.trim(),
      };
      return normalizeStages(updated);
    });

    setStatusMessage(`Stage ${selectedStageIndex + 1} kaydedildi.`);
  };

  const handleSaveWorkflow = async () => {
    if (stages.length === 0) {
      setSaveMessage('Workflow en az 1 stage icermelidir.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setSaveMessage('Yetkilendirme token bulunamadi.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/workflow-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: templateName.trim() || 'Custom Workflow',
          description: 'Visual workflow designer',
          stages: normalizeStages(stages),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Kayit islemi basarisiz.');
      }

      await loadTemplates();
      setSaveMessage('Workflow kaydedildi ve guncel veriler yuklendi.');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Bilinmeyen hata.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-210px)] min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex w-80 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-bold text-slate-900">Workflow Designer</h2>
          <p className="mt-1 text-xs text-slate-500">Approve ve reject akisini GUI uzerinden tasarla.</p>
        </div>

        <div className="space-y-3 border-b border-slate-200 bg-white px-4 py-3">
          <label className="text-xs font-semibold text-slate-600">Sablon</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelection(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="">Yeni sablon</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}{template.isActive ? ' (aktif)' : ''}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template adi"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          />

          <button
            onClick={handleDeleteTemplate}
            disabled={!selectedTemplateId}
            className="w-full rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Secili Sablonu Sil
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700">Stages ({stages.length})</h3>
            <button
              onClick={handleAddStage}
              className="rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
            >
              Yeni Stage
            </button>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-2">
            <input
              type="text"
              placeholder="Yeni stage adi"
              value={newStage.name}
              onChange={(e) => setNewStage((prev) => ({ ...prev, name: e.target.value }))}
              className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <select
              value={newStage.requiredRole}
              onChange={(e) => setNewStage((prev) => ({ ...prev, requiredRole: e.target.value }))}
              className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Pending status"
              value={newStage.pendingStatus}
              onChange={(e) => setNewStage((prev) => ({ ...prev, pendingStatus: e.target.value }))}
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </div>

          <div className="space-y-2">
            {stages.map((stage, index) => {
              const selected = selectedStageIndex === index;
              const color = getRoleColor(stage.requiredRole);
              return (
                <div
                  key={`stage-list-${index}`}
                  onClick={() => {
                    setSelectedStageIndex(index);
                    setEditStage({ ...stage });
                  }}
                  className={`cursor-pointer rounded-lg border p-2 transition ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold" style={{ color: color.text }}>S{index + 1} {stage.name}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStage(index);
                      }}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-700"
                    >
                      Sil
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Rol: {roleLabel(stage.requiredRole)}</div>
                  <div className="text-[11px] font-mono text-slate-500">{stage.pendingStatus}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-3">
          {selectedStageIndex !== null && editStage && (
            <div className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="text-[11px] font-bold text-slate-700">Stage {selectedStageIndex + 1} Duzenle</div>
              <input
                type="text"
                value={editStage.name}
                onChange={(e) => setEditStage((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              />
              <select
                value={editStage.requiredRole}
                onChange={(e) => setEditStage((prev) => (prev ? { ...prev, requiredRole: e.target.value } : prev))}
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={editStage.pendingStatus}
                onChange={(e) => setEditStage((prev) => (prev ? { ...prev, pendingStatus: e.target.value } : prev))}
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
              />

              <select
                value={typeof editStage.approveToStageIndex === 'number' ? String(editStage.approveToStageIndex) : 'approved'}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditStage((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      approveToStageIndex: value === 'approved' ? null : Number.parseInt(value, 10),
                    };
                  });
                }}
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="approved">Approve -&gt; Approved</option>
                {stages.map((_, idx) => (
                  idx !== selectedStageIndex ? (
                    <option key={`approve-target-${idx}`} value={idx}>
                      Approve -&gt; Stage {idx + 1}
                    </option>
                  ) : null
                ))}
              </select>

              <select
                value={typeof editStage.rejectToStageIndex === 'number' ? String(editStage.rejectToStageIndex) : 'rejected'}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditStage((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      rejectToStageIndex: value === 'rejected' ? null : Number.parseInt(value, 10),
                    };
                  });
                }}
                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="rejected">Reject -&gt; Rejected</option>
                {stages.map((_, idx) => (
                  idx !== selectedStageIndex ? (
                    <option key={`reject-target-${idx}`} value={idx}>
                      Reject -&gt; Stage {idx + 1}
                    </option>
                  ) : null
                ))}
              </select>

              <button
                onClick={handleSaveEditedStage}
                className="w-full rounded bg-blue-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Stage Kaydet
              </button>
            </div>
          )}

          {statusMessage && <div className="mb-2 text-[11px] text-slate-600">{statusMessage}</div>}
          {saveMessage && <div className="mb-2 text-[11px] text-slate-600">{saveMessage}</div>}

          <button
            onClick={handleSaveWorkflow}
            className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700"
          >
            Workflow Kaydet ve Aktif Et
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-100">
        <div className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs shadow">
          <div className="font-semibold text-slate-700">Gorsel Tasarim</div>
          <div className="mt-1 text-slate-500">Node tasiyin, handle'dan baglanti kurun.</div>
          <div className="text-slate-500">Edge'e tiklayarak gecisi kaldirin.</div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={handleNodeClick}
          onConnect={handleConnect}
          onEdgeClick={handleEdgeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls position="bottom-right" />
          <MiniMap pannable zoomable className="!rounded-lg !border !border-slate-200 !bg-white" />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function WorkflowDesignerTab(props: WorkflowDesignerTabProps) {
  return (
    <ReactFlowProvider>
      <WorkflowDesignerInner {...props} />
    </ReactFlowProvider>
  );
}

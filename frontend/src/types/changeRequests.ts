export type ChangeRequestWorkflowStage = {
  name: string;
  requiredRole: string;
  pendingStatus: string;
  approveToStageIndex?: number | null;
  rejectToStageIndex?: number | null;
};

export type ChangeRequestListItem = {
  id: string;
  changeCode: string;
  modelId: string;
  modelName: string;
  title: string;
  description?: string | null;
  status: string;
  requesterEmail: string;
  requesterName: string;
  createdAt: string;
  updatedAt: string;
};

export type ChangeRequestDiffColumn = {
  name: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged' | string;
  oldType?: string | null;
  newType?: string | null;
};

export type ChangeRequestDiffTable = {
  tableName: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged' | string;
  columns: ChangeRequestDiffColumn[];
};

export type ChangeRequestApprovalLog = {
  id: string;
  actorEmail: string;
  fromStatus?: string | null;
  toStatus: string;
  comment?: string | null;
  createdAt: string;
};

export type ChangeRequestDetail = {
  id: string;
  changeCode: string;
  modelId: string;
  modelName: string;
  databaseDialect: string;
  title: string;
  description?: string | null;
  status: string;
  requesterEmail: string;
  createdAt: string;
  updatedAt: string;
  oldDbmlSnapshot: string;
  newDbmlSnapshot: string;
  generatedSql: string;
  workflowStages: ChangeRequestWorkflowStage[];
  currentStageIndex: number;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canMerge: boolean;
  visualDiff: ChangeRequestDiffTable[];
  approvalLogs: ChangeRequestApprovalLog[];
};

export type ChangeRequestFilter = {
  mode: 'mine' | 'pending';
  fromDate?: string;
  toDate?: string;
  requester?: string;
  status?: string;
};

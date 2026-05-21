'use client';

import React from 'react';

interface WorkflowStage {
  name: string;
  requiredRole: string;
  pendingStatus: string;
}

interface WorkflowFlowChartProps {
  stages: WorkflowStage[];
}

const roleColorMap: Record<string, string> = {
  domain_architect: 'from-purple-500 to-purple-600',
  data_architect: 'from-blue-500 to-blue-600',
  database_admin: 'from-red-500 to-red-600',
  business_analyst: 'from-green-500 to-green-600',
  super_admin: 'from-orange-500 to-orange-600',
};

export default function WorkflowFlowChart({ stages }: WorkflowFlowChartProps) {
  const getColorClass = (role: string) => roleColorMap[role] || 'from-slate-500 to-slate-600';

  return (
    <div className="w-full overflow-x-auto bg-slate-50 rounded-xl p-6">
      <div className="flex items-center gap-2 md:gap-3 justify-start pb-2" style={{ minWidth: 'fit-content' }}>
        {/* Start */}
        <div className="flex-shrink-0 w-24 h-20 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-xs font-bold text-center px-2">
          Draft Created
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-2xl text-slate-400 hidden md:block">→</div>

        {/* Stages */}
        {stages.map((stage, idx) => (
          <React.Fragment key={idx}>
            <div className={`flex-shrink-0 w-24 h-20 rounded-lg bg-gradient-to-br ${getColorClass(stage.requiredRole)} flex flex-col items-center justify-center text-white text-xs font-bold text-center px-2 shadow-md`}>
              <div className="text-lg mb-1">👤</div>
              <div>{stage.name}</div>
            </div>
            {idx < stages.length - 1 && (
              <div className="flex-shrink-0 text-2xl text-slate-400 hidden md:block">→</div>
            )}
          </React.Fragment>
        ))}

        {/* Arrow */}
        {stages.length > 0 && (
          <div className="flex-shrink-0 text-2xl text-slate-400 hidden md:block">→</div>
        )}

        {/* Approved */}
        <div className="flex-shrink-0 w-24 h-20 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold text-center px-2 shadow-md">
          <div className="flex flex-col items-center">
            <div className="text-lg mb-1">✓</div>
            <div>Approved</div>
          </div>
        </div>
      </div>

      {/* Mobile info */}
      <div className="md:hidden text-xs text-slate-600 mt-3 text-center">
        Sağa kaydır →
      </div>
    </div>
  );
}

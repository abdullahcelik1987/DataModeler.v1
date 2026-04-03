'use client';

import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string | null;
  createdAt: string;
}

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const panelClass = 'bg-slate-50 border border-slate-200 rounded-xl p-5';
  const inputClass = 'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400';

  useEffect(() => {
    fetchAuditLogs();
  }, [page, pageSize, fromDate, toDate]);

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setLoading(false);
    } catch (err) {
      setError('Failed to load audit logs');
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_URL}/api/admin/audit-logs/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fromDate: fromDate ? new Date(fromDate).toISOString() : null,
          toDate: toDate ? new Date(toDate).toISOString() : null
        })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      a.click();
    } catch (err) {
      setError('Failed to export logs');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className={panelClass}>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Page Size</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/80">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-900">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{log.userEmail}</td>
                  <td className="px-4 py-3 truncate text-slate-600">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="text-sm text-slate-600">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} logs
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 hover:bg-slate-100 transition-colors"
          >
            Previous
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(page - 2 + i, totalPages - 4)) + i;
            return pageNum <= totalPages ? (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-4 py-2 border rounded-md ${
                  pageNum === page
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            ) : null;
          })}

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 hover:bg-slate-100 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

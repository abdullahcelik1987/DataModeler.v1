'use client';

import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Repository {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export function RepositoriesTab() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    serverUrl: '',
    personalAccessToken: ''
  });

  const panelClass = 'bg-slate-50 border border-slate-200 rounded-xl p-5';
  const inputClass = 'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400';

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_URL}/api/admin/repositories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRepositories(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load repositories');
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.serverUrl || !formData.personalAccessToken) {
      setError('Please fill in all fields');
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_URL}/api/admin/repositories/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serverUrl: formData.serverUrl,
          personalAccessToken: formData.personalAccessToken
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Repository connection successful!');
        setTimeout(() => {
          setShowForm(false);
          setFormData({ serverUrl: '', personalAccessToken: '' });
        }, 2000);
      } else {
        setError(data.message || 'Connection test failed');
      }
    } catch (err) {
      setError('Error testing repository connection');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading repositories...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Repositories List */}
      <div className={panelClass}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Azure DevOps Repositories</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Connection'}
          </button>
        </div>

        {repositories.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="mb-4">No repository connections configured</p>
            <p className="text-sm">Add a connection to integrate with Azure DevOps</p>
          </div>
        ) : (
          <div className="space-y-4">
            {repositories.map(repo => (
              <div key={repo.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                <div>
                  <h4 className="font-medium text-slate-900">{repo.name}</h4>
                  <p className="text-sm text-slate-500">
                    Created: {new Date(repo.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {repo.isDefault && (
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                      Default
                    </span>
                  )}
                  <button
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Connection Form */}
      {showForm && (
        <div className={panelClass}>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Azure DevOps Connection</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Server URL</label>
              <input
                type="text"
                value={formData.serverUrl}
                onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                placeholder="https://dev.azure.com/yourorg"
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1">Example: https://dev.azure.com/contoso</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Personal Access Token</label>
              <input
                type="password"
                value={formData.personalAccessToken}
                onChange={(e) => setFormData({ ...formData, personalAccessToken: e.target.value })}
                placeholder="Your PAT token"
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1">
                Generate a PAT from Azure DevOps with code read/write permissions
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg text-sm text-indigo-700">
              <p className="font-medium mb-2">Security Note</p>
              <p>Your Personal Access Token will be encrypted and stored securely. It won't be shown again after saving.</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:bg-slate-400 transition-colors"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-slate-200 text-slate-800 font-medium rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-xl">
        <h4 className="font-semibold text-indigo-900 mb-2">DevOps Integration</h4>
        <p className="text-indigo-700 text-sm mb-3">
          Configure Azure DevOps repositories for version control integration. In Phase 5, your data models will be automatically synchronized with your repository.
        </p>
        <ul className="text-indigo-700 text-sm space-y-1 list-disc list-inside">
          <li>Model versioning and change history</li>
          <li>Commit models to repository</li>
          <li>Collaboration and code review</li>
          <li>Integration with CI/CD pipelines</li>
        </ul>
      </div>
    </div>
  );
}

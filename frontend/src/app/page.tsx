'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [apiHealth, setApiHealth] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
        setApiHealth(response.ok ? 'healthy' : 'unhealthy');
      } catch {
        setApiHealth('unhealthy');
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            DataModeler
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Text-based data model editing with DBML format
          </p>

          {/* API Health Status */}
          <div className="mb-8 inline-block">
            <div className="px-4 py-3 rounded-lg bg-white shadow">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    apiHealth === 'healthy'
                      ? 'bg-green-500'
                      : apiHealth === 'unhealthy'
                      ? 'bg-red-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm font-medium">
                  {apiHealth === 'healthy'
                    ? 'API Connected'
                    : apiHealth === 'unhealthy'
                    ? 'API Unavailable'
                    : 'Checking...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Feature Cards */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold mb-2">Text Editor</h3>
            <p className="text-gray-600">
              Edit DBML directly with syntax highlighting and validation
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Visual Designer</h3>
            <p className="text-gray-600">
              Interactive ER diagram with bidirectional sync to code
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="text-lg font-semibold mb-2">Collaboration</h3>
            <p className="text-gray-600">
              Real-time editing with automatic conflict resolution
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Login
          </Link>
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-4">Welcome to DataModeler v0.1.0</h2>
          <div className="grid md:grid-cols-2 gap-8 text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">About DBML</h3>
              <p className="text-sm">
                DBML is a simple, readable DSL for defining database structure. 
                It lets you define tables, columns, relationships, and more in a 
                simple, human-friendly syntax.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Getting Started</h3>
              <p className="text-sm">
                Login with your Active Directory account to start creating and 
                managing your data models. Create new models, invite collaborators, 
                and generate SQL migrations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, providers, providersLoading, isAuthenticated, authChecked } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'local' | 'ldap' | 'azure_ad'>('local');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until token validation completes before redirecting.
    if (authChecked && isAuthenticated) {
      router.push('/models');
    }
  }, [authChecked, isAuthenticated, router]);

  // Update selected provider if providers are loaded
  useEffect(() => {
    if (providers.length > 0 && !providers.find(p => p.type === selectedProvider)) {
      setSelectedProvider(providers[0].type as 'local' | 'ldap' | 'azure_ad');
    }
  }, [providers, selectedProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    const success = await login(email, password, selectedProvider);
    if (!success) {
      setLocalError(error || 'Login failed');
    }
  };

  return (
    <div className="dm-page flex items-center justify-center">
      <div className="dm-shell grid max-w-5xl gap-5 lg:grid-cols-2 lg:items-stretch">
        <aside className="dm-surface hidden p-8 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Secure Access</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">DataModeler</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Sign in with your configured identity provider and continue working on governed DBML models.
          </p>

          <div className="mt-8 space-y-3">
            <div className="dm-panel p-4">
              <p className="text-sm font-semibold text-slate-900">Unified Modeling Surface</p>
              <p className="mt-1 text-xs text-slate-600">Edit text and diagrams with synchronized structure.</p>
            </div>
            <div className="dm-panel p-4">
              <p className="text-sm font-semibold text-slate-900">Enterprise Governance</p>
              <p className="mt-1 text-xs text-slate-600">Access control and audit-ready operational flows.</p>
            </div>
          </div>
        </aside>

        <section className="dm-surface w-full max-w-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-slate-900">Welcome Back</h1>
        <p className="text-center text-slate-600 mb-8">Sign in to continue to your data workspace</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          {providersLoading ? (
            <div className="text-center text-gray-500">Loading providers...</div>
          ) : providers.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Authentication Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as 'local' | 'ldap' | 'azure_ad')}
                className="dm-select"
              >
                {providers.map((provider) => (
                  <option key={provider.type} value={provider.type}>
                    {provider.description}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="dm-input disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="dm-input disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Error Message */}
          {(localError || error) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{localError || error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="dm-btn-primary w-full"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Info Text */}
        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700 font-semibold mb-2">Demo Credentials:</p>
          <p className="text-sm text-blue-600">Email: admin@datamodeler.local</p>
          <p className="text-sm text-blue-600">Password: ktdm123456</p>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-700 hover:text-blue-800 font-medium">
            ← Back to Home
          </Link>
        </div>
        </section>
      </div>
    </div>
  );
}

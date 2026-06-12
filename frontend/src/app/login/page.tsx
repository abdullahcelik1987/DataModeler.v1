'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen bg-bg-base px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <aside className="hidden lg:block rounded-3xl border border-black/10 bg-white/55 backdrop-blur-xl p-10 shadow-[0_20px_80px_-45px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#5f5f5f]">Secure Access</p>
          <h1 className="mt-3 text-5xl font-display tracking-tight text-[#1a1a1a]">mėntality</h1>
          <p className="mt-4 text-sm leading-6 text-[#646464]">
            Sign in with your configured provider and continue in your governed data workspace.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
              <p className="text-sm font-semibold text-[#1a1a1a]">Realtime Workspace</p>
              <p className="mt-1 text-xs text-[#5f5f5f]">DBML and diagram collaboration in one surface.</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
              <p className="text-sm font-semibold text-[#1a1a1a]">Enterprise Governance</p>
              <p className="mt-1 text-xs text-[#5f5f5f]">Roles, approvals and operational auditing.</p>
            </div>
          </div>
        </aside>

        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-black/10 bg-white/75 backdrop-blur-xl w-full max-w-xl p-8 md:p-10 shadow-[0_20px_80px_-45px_rgba(0,0,0,0.35)]"
        >
        <h1 className="text-4xl font-display text-center mb-2 text-[#1a1a1a]">Welcome Back</h1>
        <p className="text-center text-[#6b6b6b] mb-8">Sign in to continue to your data workspace</p>

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
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#9fff00]/60"
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
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#1a1a1a] placeholder:text-[#9a9a9a] focus:outline-none focus:ring-2 focus:ring-[#9fff00]/60 disabled:cursor-not-allowed disabled:bg-slate-100"
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
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#1a1a1a] placeholder:text-[#9a9a9a] focus:outline-none focus:ring-2 focus:ring-[#9fff00]/60 disabled:cursor-not-allowed disabled:bg-slate-100"
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
            className="w-full inline-flex h-11 items-center justify-center rounded-full bg-black text-white text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Info Text */}
        <div className="mt-8 rounded-xl border border-black/10 bg-white p-4">
          <p className="text-sm text-[#1a1a1a] font-semibold mb-2">Demo Credentials:</p>
          <p className="text-sm text-[#5f5f5f]">Email: admin@datamodeler.local</p>
          <p className="text-sm text-[#5f5f5f]">Password: ktdm123456</p>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-[#1a1a1a] hover:text-black font-medium">
            ← Back to Home
          </Link>
        </div>
        </motion.section>
      </div>
    </div>
  );
}

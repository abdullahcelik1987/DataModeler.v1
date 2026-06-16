'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';
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
    if (providers.length > 0 && !providers.find((p) => p.type === selectedProvider)) {
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
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2 lg:items-stretch">
        <aside className="hidden overflow-hidden rounded-3xl border border-black/10 bg-white/55 shadow-[0_20px_80px_-45px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
          <div className="relative h-full min-h-[720px] w-full">
            <Image src="/login-er-diagram.png" alt="Financial ER diagram" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-sky-900/25 via-sky-200/10 to-transparent" />
          </div>
        </aside>

        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_24px_60px_-35px_rgba(21,34,65,0.35)] backdrop-blur-xl md:p-10"
        >
          <h1 className="mb-2 text-center text-4xl font-display text-[#1a1a1a]">Welcome Back</h1>
          <p className="mb-8 text-center text-[#6b6b6b]">Sign in to continue to your data workspace</p>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
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

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
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

            {(localError || error) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{localError || error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-black/10 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-[#1a1a1a]">Demo Credentials:</p>
            <p className="text-sm text-[#5f5f5f]">Email: admin@datamodeler.local</p>
            <p className="text-sm text-[#5f5f5f]">Password: ktdm123456</p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="font-medium text-[#1a1a1a] hover:text-black">
              ← Back to Home
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const Spline = lazy(() => import('@splinetool/react-spline'));

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
    <div className="relative min-h-screen overflow-hidden bg-hero-bg">
      {/* Spline animated background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="absolute inset-0 bg-hero-bg" />}>
          <Spline scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode" className="w-full h-full" />
        </Suspense>
      </div>
      {/* Light overlay so panels stay readable */}
      <div className="absolute inset-0 z-[1] bg-white/50 pointer-events-none" />

      <div className="relative z-10 min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2 lg:items-stretch">
        <aside className="hidden overflow-hidden rounded-3xl border border-border/70 bg-white/55 shadow-[0_20px_80px_-45px_rgba(21,34,65,0.28)] backdrop-blur-xl lg:block">
          <div className="relative h-full min-h-[720px] w-full">
            <Image src="/login-er-diagram.png" alt="Financial ER diagram" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-secondary/10 to-transparent" />
          </div>
        </aside>

        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full rounded-3xl border border-border/80 bg-white/92 p-8 shadow-[0_24px_60px_-35px_rgba(21,34,65,0.30)] backdrop-blur-xl md:p-10"
        >
          <h1 className="mb-2 text-center text-4xl font-display text-foreground">Welcome Back</h1>
          <p className="mb-8 text-center text-muted-foreground">Sign in to continue to your data workspace</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {providersLoading ? (
              <div className="text-center text-muted-foreground">Loading providers...</div>
            ) : providers.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground/80">Authentication Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as 'local' | 'ldap' | 'azure_ad')}
                  className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/45 focus:border-primary"
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
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground/80">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/45 focus:border-primary disabled:cursor-not-allowed disabled:bg-secondary"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground/80">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/45 focus:border-primary disabled:cursor-not-allowed disabled:bg-secondary"
                placeholder="••••••••"
                required
              />
            </div>

            {(localError || error) && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{localError || error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-primary/20 bg-secondary p-4">
            <p className="mb-2 text-sm font-semibold text-foreground">Demo Credentials:</p>
            <p className="text-sm text-muted-foreground">Email: admin@datamodeler.local</p>
            <p className="text-sm text-muted-foreground">Password: ktdm123456</p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="font-medium text-primary hover:brightness-90">
              ← Back to Home
            </Link>
          </div>
        </motion.section>
      </div>
      </div>
    </div>
  );
}

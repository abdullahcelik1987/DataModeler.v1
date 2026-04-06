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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">DataModeler</h1>
        <p className="text-center text-gray-600 mb-8">DBML Data Modeling Tool</p>

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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Info Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 font-semibold mb-2">Demo Credentials:</p>
          <p className="text-sm text-blue-600">Email: admin@datamodeler.local</p>
          <p className="text-sm text-blue-600">Password: ktdm123456</p>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

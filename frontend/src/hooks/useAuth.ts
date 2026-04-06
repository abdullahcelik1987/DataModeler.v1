'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore, type User } from '@/src/stores/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const getApiBaseUrl = () => API_URL.replace(/\/$/, '').replace(/\/api$/, '');

const FALLBACK_PROVIDERS: AdProvider[] = [
  {
    type: 'local',
    isEnabled: true,
    description: 'Local Authentication',
  },
];

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface AdProvider {
  type: 'local' | 'ldap' | 'azure_ad';
  isEnabled: boolean;
  description: string;
}

export const useAuth = () => {
  const store = useAuthStore();
  const [providers, setProviders] = useState<AdProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Fetch available AD providers
  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/providers`);

      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.status}`);
      }

      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders(FALLBACK_PROVIDERS);
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  // Login user
  const login = useCallback(
    async (email: string, password: string, provider: 'local' | 'ldap' | 'azure_ad') => {
      store.setIsLoading(true);
      store.setError(null);

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, provider }),
        });

        const data: LoginResponse = await response.json();

        if (!response.ok || !data.success) {
          store.setError(data.message || 'Login failed');
          store.setIsLoading(false);
          return false;
        }

        if (data.user && data.token) {
          store.login(data.user, data.token.accessToken, data.token.refreshToken);
          localStorage.setItem('token', data.token.accessToken);
          localStorage.setItem('refreshToken', data.token.refreshToken);
        }

        store.setIsLoading(false);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        store.setError(message);
        store.setIsLoading(false);
        return false;
      }
    },
    [store]
  );

  // Logout user
  const logout = useCallback(async () => {
    try {
      await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${store.token}`,
        },
      });
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      store.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }, [store.token, store]);

  // Validate token on mount
  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      // Don't validate if:
      // 1. No token exists
      // 2. Already validating
      // 3. Component unmounted
      if (!store.token || isValidatingToken || !isMounted) {
        if (isMounted) {
          setAuthChecked(true);
        }
        return;
      }

      setIsValidatingToken(true);
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/validate-token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${store.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!isMounted) return;

        if (!response.ok) {
          store.logout();
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        if (isMounted) {
          store.logout();
        }
      } finally {
        if (isMounted) {
          setIsValidatingToken(false);
          setAuthChecked(true);
        }
      }
    };

    // Only validate once on mount, not on every store change
    validateToken();
    fetchProviders();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - validate only once on mount

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    authChecked,
    isLoading: store.isLoading,
    error: store.error,
    providers,
    providersLoading,
    login,
    logout,
    fetchProviders,
  };
};

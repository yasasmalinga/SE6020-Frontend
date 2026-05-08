import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, setApiToken } from '../api/client';
import {
  getCognitoAccessToken,
  getCognitoUserProfile,
  signOutFromCognito,
} from '../auth/cognito';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getCognitoAccessToken();
        if (!token) {
          setUser(null);
          setToken(null);
          return;
        }

        setApiToken(token);
        let resolvedUser = null;
        try {
          const response = await apiRequest('/api/auth/me');
          resolvedUser = response.user;
        } catch {
          // Allow frontend auth to proceed while backend Cognito middleware is being set up.
          resolvedUser = await getCognitoUserProfile();
        }
        if (cancelled) return;
        setUser(resolvedUser);
        setToken(token);
      } catch (error) {
        if (!cancelled) {
          if (error?.status === 401 || error?.status === 403) {
            setApiToken(null);
            setUser(null);
            setToken(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signOut = async () => {
    try {
      await signOutFromCognito();
    } catch {
      // Best effort logout if Cognito sign-out fails.
    }
    setApiToken(null);
    setUser(null);
    setToken(null);
  };

  const signIn = async (nextToken) => {
    setApiToken(nextToken);
    let resolvedUser = null;
    try {
      const response = await apiRequest('/api/auth/me');
      resolvedUser = response.user;
    } catch {
      resolvedUser = await getCognitoUserProfile();
    }
    setToken(nextToken);
    setUser(resolvedUser);
  };

  const value = useMemo(() => ({ user, token, loading, signIn, signOut }), [user, token, loading]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

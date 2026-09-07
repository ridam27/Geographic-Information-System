import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole, ApiKeyItem, AuditLogItem } from '../types/auth';

const DEFAULT_USER: UserProfile = {
  id: 'usr_admin_01',
  name: 'Enterprise Admin',
  email: 'admin@company.com',
  role: 'ORG_ADMIN',
  organizationId: 'org_meteorology_corp',
  organizationName: 'Global Meteorological Operations Corp',
};

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, role?: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  apiKeys: ApiKeyItem[];
  createApiKey: (name: string) => ApiKeyItem;
  revokeApiKey: (id: string) => void;
  auditLogs: AuditLogItem[];
  addAuditLog: (action: string, resource: string, status?: 'SUCCESS' | 'WARNING' | 'FAILED') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'aerotempest_auth_user';
const API_KEYS_STORAGE_KEY = 'aerotempest_api_keys';
const AUDIT_LOGS_STORAGE_KEY = 'aerotempest_audit_logs';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(() => {
    try {
      const saved = localStorage.getItem(API_KEYS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [
        {
          id: 'key_live_987',
          name: 'Production Weather Service Key',
          keyPrefix: 'at_live_987x...',
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          lastUsedAt: new Date().toISOString(),
          status: 'ACTIVE',
        },
      ];
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [
        {
          id: 'log_001',
          timestamp: new Date().toISOString(),
          userId: 'usr_admin_01',
          userName: 'Enterprise Admin',
          action: 'USER_LOGIN',
          resource: 'AuthService',
          ipAddress: '192.168.1.1',
          status: 'SUCCESS',
        },
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_KEY);
  }, [user]);

  useEffect(() => {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(auditLogs));
  }, [auditLogs]);

  const login = (email: string, role: UserRole = 'ORG_ADMIN') => {
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: email.split('@')[0].toUpperCase(),
      email,
      role,
      organizationId: 'org_meteorology_corp',
      organizationName: 'Global Meteorological Operations Corp',
    };
    setUser(newUser);
    addAuditLog('USER_LOGIN', 'AuthService', 'SUCCESS');
  };

  const logout = () => {
    addAuditLog('USER_LOGOUT', 'AuthService', 'SUCCESS');
    setUser(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return roles.includes(user.role);
  };

  const createApiKey = (name: string): ApiKeyItem => {
    const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const fullKey = `at_live_${randomHex}`;
    const newKey: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: name || 'Default Service Key',
      keyPrefix: `${fullKey.slice(0, 12)}...`,
      fullKey,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
    setApiKeys(prev => [newKey, ...prev]);
    addAuditLog('CREATE_API_KEY', `ApiKey:${newKey.id}`, 'SUCCESS');
    return newKey;
  };

  const revokeApiKey = (id: string) => {
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'REVOKED' } : k));
    addAuditLog('REVOKE_API_KEY', `ApiKey:${id}`, 'WARNING');
  };

  const addAuditLog = (action: string, resource: string, status: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS') => {
    const newLog: AuditLogItem = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'anonymous',
      userName: user?.name || 'Anonymous User',
      action,
      resource,
      ipAddress: '127.0.0.1',
      status,
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
        apiKeys,
        createApiKey,
        revokeApiKey,
        auditLogs,
        addAuditLog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

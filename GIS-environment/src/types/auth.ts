export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'WEATHER_ANALYST' | 'OPERATOR' | 'VIEWER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  avatarUrl?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string;
  createdAt: string;
  lastUsedAt?: string;
  status: 'ACTIVE' | 'REVOKED';
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface SystemHealthMetrics {
  apiStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  databaseStatus: 'HEALTHY' | 'DOWN';
  aiEngineStatus: 'HEALTHY' | 'DEGRADED';
  mapServiceStatus: 'HEALTHY';
  latencyMs: number;
  lastSyncTime: string;
}

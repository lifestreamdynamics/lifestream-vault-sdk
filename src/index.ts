export { LifestreamVaultClient, DEFAULT_API_URL, type ClientOptions } from './client.js';
export { VaultsResource } from './resources/vaults.js';
export { DocumentsResource } from './resources/documents.js';
export { SearchResource } from './resources/search.js';
export { AiResource } from './resources/ai.js';
export { ApiKeysResource } from './resources/api-keys.js';
export type { ApiKey, ApiKeyWithSecret, CreateApiKeyParams, UpdateApiKeyParams } from './resources/api-keys.js';
export { UserResource } from './resources/user.js';
export type { User, VaultStorage, StorageUsage } from './resources/user.js';
export { SubscriptionResource } from './resources/subscription.js';
export type { Subscription, Plan, CheckoutSession, PortalSession, Invoice } from './resources/subscription.js';
export { TeamsResource } from './resources/teams.js';
export type { Team, TeamMember, TeamInvitation, CreateTeamParams, UpdateTeamParams } from './resources/teams.js';
export { SharesResource } from './resources/shares.js';
export type { ShareLink, CreateShareLinkParams, CreateShareLinkResponse } from './resources/shares.js';
export { PublishResource } from './resources/publish.js';
export type { PublishedDocument, PublishedDocumentWithMeta, PublishDocumentParams, UpdatePublishParams } from './resources/publish.js';
export { ConnectorsResource } from './resources/connectors.js';
export type {
  Connector,
  ConnectorSyncLog,
  CreateConnectorParams,
  UpdateConnectorParams,
  TestConnectionResult,
  TriggerSyncResult,
  ConnectorProvider,
  SyncDirection,
  ConnectorStatus,
} from './resources/connectors.js';
export { HooksResource } from './resources/hooks.js';
export type { Hook, HookExecution, CreateHookParams, UpdateHookParams } from './resources/hooks.js';
export { WebhooksResource } from './resources/webhooks.js';
export type { Webhook, WebhookWithSecret, WebhookDelivery, CreateWebhookParams, UpdateWebhookParams } from './resources/webhooks.js';
export { AdminResource } from './resources/admin.js';
export type {
  SystemStats,
  TimeseriesDataPoint,
  TimeseriesResponse,
  AdminUser,
  AdminUserListResponse,
  AdminUserDetail,
  AdminUserListParams,
  AdminUpdateUserParams,
  ActivityEntry,
  SubscriptionSummary,
  SystemHealth,
} from './resources/admin.js';
export { MfaResource } from './resources/mfa.js';

// Request signing
export {
  signRequest,
  buildSignaturePayload,
  signPayload,
  generateNonce,
  SIGNATURE_HEADER,
  SIGNATURE_TIMESTAMP_HEADER,
  SIGNATURE_NONCE_HEADER,
  MAX_TIMESTAMP_AGE_MS,
} from './lib/signature.js';

// Audit logging
export { AuditLogger, type AuditEntry, type AuditLoggerOptions } from './lib/audit-logger.js';

// Encryption
export {
  generateVaultKey,
  encrypt as encryptContent,
  decrypt as decryptContent,
  isEncryptedEnvelope,
  type EncryptedEnvelope,
} from './lib/encryption.js';

// Token management
export {
  TokenManager,
  decodeJwtPayload,
  isTokenExpired,
  type AuthTokens,
  type JwtPayload,
  type OnTokenRefresh,
  type TokenManagerOptions,
} from './lib/token-manager.js';

// Error classes
export {
  SDKError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  NetworkError,
} from './errors.js';

// Types
export type {
  PaginatedResponse,
  ApiErrorResponse,
  MessageResponse,
  Vault,
  Document,
  DocumentWithContent,
  DocumentListItem,
  SearchResult,
  SearchResponse,
  AiChatSession,
  AiChatMessage,
} from './types/index.js';

/** Standard paginated list response envelope. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Standard API error response body. */
export interface ApiErrorResponse {
  message: string;
  details?: unknown;
}

/** Standard success message response. */
export interface MessageResponse {
  message: string;
}

/** Successful authentication response. */
export interface AuthResponse {
  user: { id: string; email: string; displayName: string; role: string; isActive: boolean; mfaEnabled: boolean; emailVerified: boolean; avatarUrl: string | null; profileSlug: string | null };
  accessToken: string;
}

/** MFA method identifier. */
export type MfaMethod = 'totp' | 'passkey' | 'backup_code';

/** Returned instead of AuthResponse when the account has MFA enabled. */
export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaToken: string;
  mfaMethods: MfaMethod[];
  user: { email: string; displayName: string };
}

/** Type guard — returns true when a login response requires MFA completion. */
export function isMfaChallenge(
  response: AuthResponse | MfaChallengeResponse,
): response is MfaChallengeResponse {
  return 'mfaRequired' in response && response.mfaRequired === true;
}

/** MFA status for the authenticated user's account. */
export interface MfaStatus {
  mfaEnabled: boolean;
  totpConfigured: boolean;
  passkeyCount: number;
  backupCodesRemaining: number;
  passkeys: PasskeyInfo[];
}

/** TOTP setup initiation response. */
export interface TotpSetupResponse {
  secret: string;
  otpauthUri: string;
  qrCodeDataUri: string;
}

/** Registered passkey summary. */
export interface PasskeyInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

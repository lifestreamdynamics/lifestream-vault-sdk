# Lifestream Vault SDK

Official TypeScript SDK for the Lifestream Vault API. Build powerful integrations with your Lifestream Vault account using a modern, type-safe client library.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@lifestreamdynamics/vault-sdk.svg)](https://www.npmjs.com/package/@lifestreamdynamics/vault-sdk)

## 📖 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Authentication](#-authentication)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Examples](#-examples)
- [Error Handling](#-error-handling)
- [TypeScript](#-typescript)
- [Advanced Features](#-advanced-features)
- [Documentation](#-documentation)
- [Related Packages](#-related-packages)
- [Troubleshooting](#-troubleshooting)
- [Support](#-support)
- [License](#-license)

## ✨ Features

- **Full API Coverage** - Complete support for all Lifestream Vault API endpoints
- **TypeScript First** - Built with TypeScript, includes full type definitions
- **Dual Authentication** - Supports both API keys (`lsv_k_*`) and JWT tokens
- **Auto Token Refresh** - Automatic JWT token renewal with configurable refresh buffer
- **Request Signing** - HMAC-SHA256 request signing for enhanced security
- **Client-Side Encryption** - Optional end-to-end encryption for vault content
- **Smart Error Handling** - Typed error classes with detailed context
- **Modern ESM** - ES modules for tree-shaking and optimal bundle size
- **Built on Ky** - Leverages the modern, lightweight HTTP client
- **Audit Logging** - Optional client-side request audit logging
- **Zero Dependencies** - Only requires `ky` for HTTP requests

## 📦 Installation

### NPM (Recommended)

```bash
npm install @lifestreamdynamics/vault-sdk
```

### Yarn

```bash
yarn add @lifestreamdynamics/vault-sdk
```

### pnpm

```bash
pnpm add @lifestreamdynamics/vault-sdk
```

### CDN

```html
<!-- ES Module -->
<script type="module">
  import { LifestreamVaultClient } from 'https://unpkg.com/@lifestreamdynamics/vault-sdk/dist/index.js';
</script>

<!-- Or via jsDelivr -->
<script type="module">
  import { LifestreamVaultClient } from 'https://cdn.jsdelivr.net/npm/@lifestreamdynamics/vault-sdk/+esm';
</script>
```

## 🚀 Quick Start

> **Self-hosting?** Replace `https://vault.lifestreamdynamics.com` with your server's URL, or set the `LSVAULT_API_URL` environment variable.

### Basic Usage with API Key

```typescript
import { LifestreamVaultClient } from '@lifestreamdynamics/vault-sdk';

const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  apiKey: 'lsv_k_your_api_key_here',
});

// List all vaults
const vaults = await client.vaults.list();
console.log(vaults);

// Get a document
const doc = await client.documents.get('vault-id', 'path/to/document.md');
console.log(doc.content);
```

### Login with Email and Password

```typescript
import { LifestreamVaultClient } from '@lifestreamdynamics/vault-sdk';

const { client, tokens } = await LifestreamVaultClient.login(
  'https://vault.lifestreamdynamics.com',
  'user@example.com',
  'your-password',
);

// Client is now authenticated with JWT tokens
const vaults = await client.vaults.list();
```

### Using an Existing JWT Token

```typescript
const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  accessToken: 'eyJhbGci...', // Your JWT access token
  refreshToken: 'your_refresh_token', // Optional: enables auto-refresh
});
```

### Error Handling

```typescript
import { LifestreamVaultClient, NotFoundError, AuthenticationError } from '@lifestreamdynamics/vault-sdk';

try {
  const vault = await client.vaults.get('non-existent-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Vault not found:', error.message);
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 🔐 Authentication

The SDK supports two authentication methods:

### 1. API Key Authentication

Best for server-side integrations, automation scripts, and long-running services.

```typescript
const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  apiKey: 'lsv_k_your_api_key_here', // Starts with 'lsv_k_'
});
```

**Features:**
- Simple, static authentication
- No expiration or refresh required
- Automatic HMAC request signing for mutating operations
- Scoped permissions (read-only, read-write, or vault-specific)

**How to get an API key:**
1. Log in to your Lifestream Vault account
2. Navigate to Settings → API Keys
3. Click "Create API Key"
4. Configure scopes and expiration
5. Copy your key (starts with `lsv_k_`)

### 2. JWT Token Authentication

Best for user-facing applications and scenarios requiring user-specific permissions.

```typescript
const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  accessToken: 'eyJhbGci...', // Your JWT access token
  refreshToken: 'your_refresh_token', // Optional but recommended
  refreshBufferMs: 60000, // Refresh 60s before expiry (default)
  onTokenRefresh: (tokens) => {
    // Save new tokens to your storage
    localStorage.setItem('accessToken', tokens.accessToken);
  },
});
```

**Features:**
- User-specific permissions
- Automatic token refresh (when `refreshToken` provided)
- Configurable refresh timing
- Token refresh callbacks for persistence

**Login Helper:**
```typescript
const { client, tokens, refreshToken } = await LifestreamVaultClient.login(
  'https://vault.lifestreamdynamics.com',
  'user@example.com',
  'password',
  {
    onTokenRefresh: (newTokens) => {
      // Persist tokens for session restoration
      sessionStorage.setItem('tokens', JSON.stringify(newTokens));
    },
  },
);
```

## 📚 API Reference

The SDK provides resource-based access to all API endpoints:

### Vaults

Manage vault containers for organizing documents.

```typescript
// List all vaults
const vaults = await client.vaults.list();

// Get a specific vault
const vault = await client.vaults.get('vault-id');

// Create a new vault
const newVault = await client.vaults.create({
  name: 'My Notes',
  slug: 'my-notes', // Optional: auto-generated from name
  description: 'Personal notes and ideas',
  encryptionEnabled: false,
});

// Update a vault
const updated = await client.vaults.update('vault-id', {
  name: 'Updated Name',
  description: 'New description',
});

// Delete a vault
await client.vaults.delete('vault-id');

// Get the link graph for a vault
const graph = await client.vaults.getGraph('vault-id');
console.log(`${graph.nodes.length} documents, ${graph.edges.length} links`);

// Get unresolved (broken) links
const broken = await client.vaults.getUnresolvedLinks('vault-id');
for (const link of broken) {
  console.log(`Missing: ${link.targetPath}`);
  for (const ref of link.references) {
    console.log(`  Referenced by: ${ref.sourcePath}`);
  }
}
```

### Documents

Read, write, and manage Markdown documents within vaults.

```typescript
// List documents in a vault
const docs = await client.documents.list('vault-id');

// Get a document with content
const doc = await client.documents.get('vault-id', 'path/to/doc.md');
console.log(doc.content); // Raw Markdown content

// Create or update a document
await client.documents.put('vault-id', 'new-doc.md', '# Hello World\n\nMy content');

// Get document metadata only
const metadata = await client.documents.getMetadata('vault-id', 'path/to/doc.md');

// Delete a document
await client.documents.delete('vault-id', 'path/to/doc.md');

// Get directory tree structure
const tree = await client.documents.tree('vault-id');

// Get forward links from a document
const links = await client.documents.getLinks('vault-id', 'notes/index.md');
for (const link of links) {
  console.log(`[[${link.linkText}]] -> ${link.targetPath} (resolved: ${link.isResolved})`);
}

// Get backlinks pointing to a document
const backlinks = await client.documents.getBacklinks('vault-id', 'notes/important.md');
console.log(`${backlinks.length} documents link to this one`);
for (const bl of backlinks) {
  console.log(`- ${bl.sourceDocument.path}: [[${bl.linkText}]]`);
}

// List document versions
const versions = await client.documents.listVersions('vault-id', 'path/to/doc.md');

// Get a specific version
const version = await client.documents.getVersion('vault-id', 'path/to/doc.md', 5);

// Compare versions (diff)
const diff = await client.documents.diffVersions('vault-id', 'path/to/doc.md', 3, 5);
```

### Search

Full-text search across your vaults with filtering.

```typescript
// Search all vaults
const results = await client.search.search({
  query: 'typescript',
  vaultIds: ['vault-1', 'vault-2'], // Optional: filter by vaults
  tags: ['code', 'tutorial'], // Optional: filter by tags
  limit: 20,
  offset: 0,
});

for (const result of results.results) {
  console.log(result.title, result.highlight);
}

// Get autocomplete suggestions
const suggestions = await client.search.autocomplete('type');
```

### AI

AI-powered document chat and summarization.

```typescript
// Create a chat session
const session = await client.ai.createSession({
  vaultId: 'vault-id',
  documentPaths: ['doc1.md', 'doc2.md'], // Optional: specific docs
  systemPrompt: 'You are a helpful assistant.', // Optional
});

// Send a message
const response = await client.ai.sendMessage(session.id, {
  message: 'Summarize the key points from these documents',
});

console.log(response.message); // AI response

// List all chat sessions
const sessions = await client.ai.listSessions();

// Get session details
const sessionDetail = await client.ai.getSession(session.id);

// Delete a session
await client.ai.deleteSession(session.id);
```

### Teams

Collaborate with team members on shared vaults.

```typescript
// List your teams
const teams = await client.teams.list();

// Create a team
const team = await client.teams.create({
  name: 'Engineering',
  description: 'Engineering team workspace',
});

// Add a member
await client.teams.addMember(team.id, {
  email: 'colleague@example.com',
  role: 'member', // 'admin' or 'member'
});

// Create a team vault
const teamVault = await client.teams.createVault(team.id, {
  name: 'Team Docs',
});

// List team vaults
const teamVaults = await client.teams.listVaults(team.id);
```

### API Keys

Manage API keys for programmatic access.

```typescript
// List API keys
const keys = await client.apiKeys.list();

// Create an API key
const apiKey = await client.apiKeys.create({
  name: 'CI/CD Key',
  scopes: ['vaults:read', 'documents:read'],
  vaultId: 'vault-id', // Optional: scope to specific vault
  expiresAt: '2026-12-31T23:59:59Z', // Optional
});

console.log(apiKey.secret); // Only shown once! Save it securely

// Delete an API key
await client.apiKeys.delete('key-id');
```

### User

Manage user profile and storage information.

```typescript
// Get current user profile
const user = await client.user.get();
console.log(user.email, user.name);

// Get storage usage
const storage = await client.user.getStorage();
console.log(`Used: ${storage.totalBytes} / ${storage.limitBytes} bytes`);
```

### Subscription

Manage subscription plans and billing.

```typescript
// Get current subscription
const subscription = await client.subscription.get();
console.log(subscription.tier); // 'free', 'pro', or 'business'

// Get available plans
const plans = await client.subscription.getPlans();

// Create a checkout session for upgrading
const checkout = await client.subscription.createCheckout({
  planId: 'pro-monthly',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
});

// Open checkout.url in browser for payment

// Create a billing portal session
const portal = await client.subscription.createPortalSession({
  returnUrl: 'https://example.com/settings',
});
```

### Shares

Create temporary share links for documents.

```typescript
// Create a share link
const share = await client.shares.create({
  vaultId: 'vault-id',
  documentPath: 'path/to/doc.md',
  expiresAt: '2026-03-01T00:00:00Z', // Optional
  password: 'secret123', // Optional
});

console.log(share.shareUrl); // Share this URL

// List all shares
const shares = await client.shares.list();

// Revoke a share
await client.shares.delete('share-token');
```

### Publish

Publish documents for public access.

```typescript
// Publish a document
const published = await client.publish.publish({
  vaultId: 'vault-id',
  documentPath: 'blog/post.md',
  slug: 'my-blog-post', // Optional: auto-generated
});

console.log(published.publicUrl); // Public URL

// List published documents
const docs = await client.publish.list();

// Unpublish
await client.publish.unpublish('vault-id', 'blog/post.md');
```

### Connectors

Sync with external services like Google Drive.

```typescript
// List connectors
const connectors = await client.connectors.list();

// Create a Google Drive connector
const connector = await client.connectors.create({
  vaultId: 'vault-id',
  provider: 'google_drive',
  config: {
    folderId: 'google-drive-folder-id',
    credentials: { /* OAuth credentials */ },
  },
  syncDirection: 'bidirectional',
});

// Test connection
const testResult = await client.connectors.testConnection(connector.id);
console.log(testResult.success);

// Trigger manual sync
await client.connectors.triggerSync(connector.id);

// View sync logs
const logs = await client.connectors.getSyncLogs(connector.id);
```

### Hooks

Configure internal event handlers for automation.

```typescript
// List hooks
const hooks = await client.hooks.list('vault-id');

// Create a hook
const hook = await client.hooks.create('vault-id', {
  name: 'Auto-tag documents',
  eventType: 'document.created',
  handlerType: 'auto_tag',
  config: {
    tags: ['inbox'],
  },
  enabled: true,
});

// View hook executions
const executions = await client.hooks.getExecutions('vault-id', hook.id);
```

### Webhooks

Send HTTP notifications on vault events.

```typescript
// List webhooks
const webhooks = await client.webhooks.list('vault-id');

// Create a webhook
const webhook = await client.webhooks.create('vault-id', {
  url: 'https://example.com/webhook',
  events: ['document.created', 'document.updated'],
  enabled: true,
});

console.log(webhook.secret); // Use for HMAC verification

// View delivery logs
const deliveries = await client.webhooks.getDeliveries('vault-id', webhook.id);
```

### Admin

Administrative operations (requires admin role).

```typescript
// Get system stats
const stats = await client.admin.getStats();
console.log(stats.totalUsers, stats.totalVaults);

// List all users (paginated)
const users = await client.admin.listUsers({ page: 1, limit: 50 });

// Get user details
const userDetail = await client.admin.getUser('user-id');

// Update user
await client.admin.updateUser('user-id', {
  role: 'admin',
  isActive: true,
});

// Get system health
const health = await client.admin.getHealth();
console.log(health.status); // 'healthy', 'degraded', or 'down'
```

### Calendar

```typescript
// Get aggregated calendar view (free tier)
const calendar = await client.calendar.getCalendar(vaultId, { month: 2, year: 2026 });

// Get activity heatmap for past year (free tier)
const activity = await client.calendar.getActivity(vaultId);

// Get documents by due date (pro tier)
const due = await client.calendar.getDue(vaultId, { from: '2026-02-01', to: '2026-02-28' });

// Get agenda view (pro tier)
const agenda = await client.calendar.getAgenda(vaultId, { groupBy: 'week' });

// Create a calendar event (pro tier)
const event = await client.calendar.createEvent(vaultId, {
  title: 'Team Review',
  startAt: '2026-02-20T10:00:00Z',
  endAt: '2026-02-20T11:00:00Z',
});

// List calendar events (pro tier)
const events = await client.calendar.listEvents(vaultId);

// Update event (pro tier)
await client.calendar.updateEvent(vaultId, eventId, { title: 'Updated Review' });

// Delete event (pro tier)
await client.calendar.deleteEvent(vaultId, eventId);
```

### MFA

```typescript
// Get MFA status
const status = await client.mfa.getStatus();

// Set up TOTP (returns QR code URI)
const setup = await client.mfa.setupTotp();

// Verify and enable TOTP
await client.mfa.verifyTotp({ token: '123456' });

// Register a passkey
const registration = await client.mfa.startPasskeyRegistration();
await client.mfa.finishPasskeyRegistration(registration.options);

// List passkeys
const passkeys = await client.mfa.listPasskeys();

// Regenerate backup codes
const codes = await client.mfa.regenerateBackupCodes();
```

## ⚙️ Configuration

### ClientOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `https://vault.lifestreamdynamics.com` | Base URL of your Lifestream Vault server (optional, defaults to production) |
| `apiKey` | `string` | - | API key for authentication (starts with `lsv_k_`) |
| `accessToken` | `string` | - | JWT access token for user authentication |
| `refreshToken` | `string` | - | JWT refresh token for automatic renewal |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `refreshBufferMs` | `number` | `60000` | Milliseconds before expiry to trigger proactive refresh |
| `onTokenRefresh` | `function` | - | Callback when tokens are refreshed |
| `enableRequestSigning` | `boolean` | `true` (API keys) | Enable HMAC request signing |
| `enableAuditLogging` | `boolean` | `false` | Enable client-side audit logging |
| `auditLogPath` | `string` | `~/.lsvault/audit.log` | Path to audit log file |

### Full Configuration Example

```typescript
const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  apiKey: 'lsv_k_your_api_key',
  timeout: 60000, // 60 seconds
  enableRequestSigning: true,
  enableAuditLogging: true,
  auditLogPath: '/var/log/lsvault-audit.log',
});
```

### JWT Configuration Example

```typescript
const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  accessToken: 'eyJhbGci...',
  refreshToken: 'refresh_token_here',
  refreshBufferMs: 120000, // Refresh 2 minutes before expiry
  onTokenRefresh: (tokens) => {
    // Persist new tokens
    localStorage.setItem('accessToken', tokens.accessToken);
    console.log('Tokens refreshed successfully');
  },
});
```

## 💡 Examples

### Create a Vault and Upload Documents

```typescript
import { LifestreamVaultClient } from '@lifestreamdynamics/vault-sdk';

const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  apiKey: 'lsv_k_your_api_key',
});

// Create a vault
const vault = await client.vaults.create({
  name: 'Project Documentation',
  description: 'Technical docs for the new project',
});

// Upload multiple documents
const docs = [
  { path: 'README.md', content: '# Project Overview\n\nWelcome!' },
  { path: 'setup/installation.md', content: '# Installation\n\n...' },
  { path: 'api/reference.md', content: '# API Reference\n\n...' },
];

for (const doc of docs) {
  await client.documents.put(vault.id, doc.path, doc.content);
  console.log(`Uploaded: ${doc.path}`);
}

console.log('Vault created and documents uploaded successfully!');
```

### Search and Export Documents

```typescript
// Search for documents with specific tags
const results = await client.search.search({
  query: 'API',
  tags: ['documentation', 'tutorial'],
  vaultIds: [vault.id],
});

// Export matching documents
for (const result of results.results) {
  const doc = await client.documents.get(result.vaultId, result.path);

  // Save to local file system
  await fs.writeFile(`./export/${result.path}`, doc.content);
  console.log(`Exported: ${result.path}`);
}
```

### AI-Powered Document Q&A

```typescript
// Create an AI session with specific documents
const session = await client.ai.createSession({
  vaultId: vault.id,
  documentPaths: ['api/reference.md', 'setup/installation.md'],
  systemPrompt: 'You are a technical documentation assistant.',
});

// Ask questions about the documents
const response1 = await client.ai.sendMessage(session.id, {
  message: 'What are the authentication methods supported?',
});

console.log('AI:', response1.message);

const response2 = await client.ai.sendMessage(session.id, {
  message: 'How do I install the SDK?',
});

console.log('AI:', response2.message);
```

### Automated Backup Script

```typescript
import { LifestreamVaultClient } from '@lifestreamdynamics/vault-sdk';
import fs from 'fs/promises';
import path from 'path';

const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  apiKey: process.env.LSVAULT_API_KEY!,
});

async function backupAllVaults() {
  const vaults = await client.vaults.list();
  const backupDir = `./backups/${new Date().toISOString().split('T')[0]}`;

  await fs.mkdir(backupDir, { recursive: true });

  for (const vault of vaults) {
    console.log(`Backing up vault: ${vault.name}`);
    const documents = await client.documents.list(vault.id);

    for (const doc of documents) {
      const docData = await client.documents.get(vault.id, doc.path);
      const filePath = path.join(backupDir, vault.slug, doc.path);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, docData.content);
    }

    console.log(`✓ Backed up ${documents.length} documents from ${vault.name}`);
  }

  console.log(`Backup completed: ${backupDir}`);
}

backupAllVaults().catch(console.error);
```

### Team Collaboration Setup

```typescript
// Create a team
const team = await client.teams.create({
  name: 'Marketing Team',
  description: 'Marketing team collaboration space',
});

// Add team members
const members = [
  { email: 'alice@example.com', role: 'admin' },
  { email: 'bob@example.com', role: 'member' },
  { email: 'carol@example.com', role: 'member' },
];

for (const member of members) {
  await client.teams.addMember(team.id, member);
  console.log(`Added ${member.email} as ${member.role}`);
}

// Create a shared vault for the team
const teamVault = await client.teams.createVault(team.id, {
  name: 'Campaign Materials',
  description: 'Shared marketing campaign documents',
});

// Upload initial documents
await client.documents.put(
  teamVault.id,
  'campaigns/2026-q1.md',
  '# Q1 2026 Campaign\n\n## Goals\n- Increase brand awareness\n- Launch new product',
);

console.log('Team setup complete!');
```

## 🚨 Error Handling

The SDK provides typed error classes for different error scenarios:

### Error Types

```typescript
import {
  SDKError,           // Base error class
  ValidationError,    // Invalid input or configuration
  AuthenticationError,// Authentication failed
  AuthorizationError, // Insufficient permissions
  NotFoundError,      // Resource not found
  ConflictError,      // Resource conflict (e.g., duplicate slug)
  RateLimitError,     // Rate limit exceeded
  NetworkError,       // Network or connection error
} from '@lifestreamdynamics/vault-sdk';
```

### Handling Specific Errors

```typescript
try {
  await client.vaults.create({ name: 'My Vault', slug: 'existing-slug' });
} catch (error) {
  if (error instanceof ConflictError) {
    console.error('A vault with this slug already exists');
  } else if (error instanceof ValidationError) {
    console.error('Invalid vault configuration:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded. Try again later.');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Properties

All SDK errors include:

```typescript
error.message    // Human-readable error message
error.status     // HTTP status code (if applicable)
error.context    // Additional error context (resource type, ID, etc.)
```

### Retry Logic Example

```typescript
import { RateLimitError, NetworkError } from '@lifestreamdynamics/vault-sdk';

async function fetchWithRetry(operation: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof RateLimitError || error instanceof NetworkError) {
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
}

// Usage
const vaults = await fetchWithRetry(() => client.vaults.list());
```

## 📘 TypeScript

The SDK is built with TypeScript and provides full type definitions out of the box.

### Type Imports

```typescript
import {
  LifestreamVaultClient,
  type ClientOptions,
  type Vault,
  type Document,
  type DocumentWithContent,
  type SearchResult,
  type AiChatSession,
  type Team,
  type ApiKey,
  type Subscription,
} from '@lifestreamdynamics/vault-sdk';
```

### Type Safety

```typescript
// Compiler catches missing required fields
const vault = await client.vaults.create({
  name: 'My Vault',
  // slug is optional, auto-generated
  // TypeScript won't let you pass invalid fields
});

// Full autocomplete and type checking
const doc = await client.documents.get('vault-id', 'path.md');
doc.content; // string
doc.document.tags; // string[]
doc.document.sizeBytes; // number
```

### Generic Error Handling

```typescript
import { SDKError } from '@lifestreamdynamics/vault-sdk';

try {
  await client.vaults.get('invalid-id');
} catch (error) {
  if (error instanceof SDKError) {
    // TypeScript knows about status, message, context
    console.error(`Error ${error.status}: ${error.message}`);
  }
}
```

## 🔧 Advanced Features

### Request Signing (HMAC-SHA256)

Automatically enabled for API key authentication. Adds signature headers to mutating requests (PUT, POST, DELETE, PATCH) for enhanced security.

```typescript
const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  apiKey: 'lsv_k_your_api_key',
  enableRequestSigning: true, // Default: true for API keys
});

// All mutating requests are now signed with HMAC-SHA256
await client.documents.put('vault-id', 'doc.md', 'content');
```

**How Request Signing Works:**

The SDK automatically signs write operations (PUT, DELETE on documents) using HMAC-SHA256. The signature is computed from a canonical payload that includes:

1. **HTTP Method** (uppercase, e.g., `PUT`)
2. **Request Path** (full pathname including `/api/v1` prefix, e.g., `/api/v1/vaults/{id}/documents/path.md`)
3. **ISO Timestamp** (must be within 5 minutes of server time)
4. **Nonce** (16-byte hex string for replay protection)
5. **Body Hash** (SHA-256 hash of the request body)

The payload format is: `METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY_HASH`

The HMAC signature is computed using your full API key as the secret, and three headers are attached to the request:

- `X-Signature` - The HMAC-SHA256 signature (hex-encoded)
- `X-Signature-Timestamp` - ISO-8601 timestamp
- `X-Signature-Nonce` - 16-byte hex nonce (unique per request)

**Security Features:**

- **Timestamp validation**: Requests older than 5 minutes are rejected, preventing replay attacks
- **Nonce tracking**: Each nonce can only be used once within a 10-minute window (enforced via Redis)
- **Constant-time comparison**: Prevents timing attacks during signature verification

**Manual Signing:**

```typescript
import { signRequest } from '@lifestreamdynamics/vault-sdk';

const headers = signRequest(
  'lsv_k_your_api_key',
  'POST',
  '/api/v1/vaults',
  JSON.stringify({ name: 'My Vault' }),
);

console.log(headers['x-signature']); // HMAC signature
console.log(headers['x-signature-timestamp']); // ISO timestamp
console.log(headers['x-signature-nonce']); // Random nonce
```

### Audit Logging

Enable client-side request logging for compliance and debugging.

```typescript
const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  apiKey: 'lsv_k_your_api_key',
  enableAuditLogging: true,
  auditLogPath: '/var/log/lsvault/audit.log',
});

// All requests are now logged to the audit file
await client.vaults.list();

// Log entry format:
// {"timestamp":"2026-02-14T10:30:00.000Z","method":"GET","path":"/api/v1/vaults","status":200,"durationMs":145}
```

**Standalone Audit Logger:**

```typescript
import { AuditLogger } from '@lifestreamdynamics/vault-sdk';

const logger = new AuditLogger({ logPath: './custom-audit.log' });

logger.log({
  timestamp: new Date().toISOString(),
  method: 'POST',
  path: '/api/v1/vaults',
  status: 201,
  durationMs: 234,
});
```

### Client-Side Encryption

Encrypt vault content client-side before uploading (requires encryption-enabled vault).

```typescript
import { generateVaultKey, encryptContent, decryptContent } from '@lifestreamdynamics/vault-sdk';

// Generate a vault encryption key (save this securely!)
const vaultKey = generateVaultKey();
console.log('Save this key:', vaultKey); // Base64-encoded AES-256 key

// Create an encryption-enabled vault
const vault = await client.vaults.create({
  name: 'Secure Vault',
  encryptionEnabled: true,
});

// Encrypt content before uploading
const plaintext = '# Secret Document\n\nSensitive information here.';
const encrypted = encryptContent(plaintext, vaultKey);

await client.documents.put(vault.id, 'secret.md', encrypted);

// Decrypt when reading
const doc = await client.documents.get(vault.id, 'secret.md');
const decrypted = decryptContent(doc.content, vaultKey);
console.log(decrypted); // Original plaintext
```

**Note:** The server never sees your encryption key. Store it securely and never lose it—there's no recovery mechanism.

### Token Management Utilities

```typescript
import { decodeJwtPayload, isTokenExpired } from '@lifestreamdynamics/vault-sdk';

const token = 'eyJhbGci...';

// Decode JWT payload without verification
const payload = decodeJwtPayload(token);
console.log(payload.userId, payload.email);

// Check if token is expired
if (isTokenExpired(token)) {
  console.log('Token has expired, need to refresh');
}
```

### Direct HTTP Access

Access the underlying `ky` HTTP client for custom requests:

```typescript
const client = new LifestreamVaultClient({
  baseUrl: 'https://vault.lifestreamdynamics.com',
  apiKey: 'lsv_k_your_api_key',
});

// Make custom API requests
const response = await client.http.get('custom/endpoint').json();

// The client is pre-configured with:
// - Authentication headers
// - Base URL (https://vault.lifestreamdynamics.com/api/v1)
// - Timeout settings
// - Request signing (if enabled)
```

## 📚 Documentation

For complete API documentation, guides, and examples, visit:

**[https://vault.lifestreamdynamics.com/docs](https://vault.lifestreamdynamics.com/docs)**

### Additional Resources

- **API Reference**: Full OpenAPI spec at your server's `/api/docs`
- **Integration Guides**: Step-by-step tutorials for common use cases
- **Best Practices**: Security, performance, and architecture recommendations
- **Migration Guides**: Upgrade paths for major version changes

## 🔗 Related Packages

- **[@lifestreamdynamics/vault-cli](https://www.npmjs.com/package/@lifestreamdynamics/vault-cli)** - Command-line interface for Lifestream Vault

## 🐛 Troubleshooting

### Connection Issues

**Problem:** `NetworkError: Failed to fetch`

**Solutions:**
- ✅ Verify the `baseUrl` is correct and accessible
- ✅ Check network connectivity
- ✅ Ensure CORS is configured on the server (for browser usage)
- ✅ Try increasing the `timeout` option

### Authentication Failures

**Problem:** `AuthenticationError: Invalid credentials`

**Solutions:**
- ✅ Verify your API key or JWT token is valid
- ✅ Check that the API key starts with `lsv_k_`
- ✅ Ensure the token hasn't expired
- ✅ For JWT auth, verify the `refreshToken` is correct

### Rate Limiting

**Problem:** `RateLimitError: Too many requests`

**Solutions:**
- ✅ Implement exponential backoff retry logic
- ✅ Reduce request frequency
- ✅ Consider upgrading your subscription plan
- ✅ Cache frequently accessed data

### TypeScript Errors

**Problem:** Type errors when importing

**Solutions:**
- ✅ Ensure TypeScript version is 5.0 or higher
- ✅ Check that `moduleResolution` is set to `node16` or `bundler` in `tsconfig.json`
- ✅ Verify `"type": "module"` in your `package.json` for ESM projects

### HMAC Signature Failures

**Problem:** `AuthorizationError: Invalid signature`

**Solutions:**
- ✅ Ensure server and client clocks are synchronized
- ✅ Verify `enableRequestSigning` is enabled on the client
- ✅ Check that the API key is correct and has signing permissions
- ✅ Ensure no middleware is modifying request bodies

### Token Refresh Not Working

**Problem:** `AuthenticationError` despite having a refresh token

**Solutions:**
- ✅ Verify `refreshToken` is provided in `ClientOptions`
- ✅ Check that the refresh token hasn't expired
- ✅ Ensure `onTokenRefresh` callback is saving new tokens
- ✅ Verify server-side refresh endpoint is accessible

## 💬 Support

Need help? We're here for you!

- **GitHub Issues**: [Report bugs or request features](https://github.com/lifestreamdynamics/lifestream-vault-sdk/issues)
- **Email**: eric@lifestreamdynamics.com
- **Documentation**: [vault.lifestreamdynamics.com/docs](https://vault.lifestreamdynamics.com/docs)

When reporting issues, please include:
- SDK version (`npm list @lifestreamdynamics/vault-sdk`)
- Node.js version (`node --version`)
- Error messages and stack traces
- Minimal reproduction code (without sensitive credentials)

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

Copyright (c) 2025-2026 Lifestream Dynamics

---

**Built with ❤️ by [Lifestream Dynamics](https://lifestreamdynamics.com)**

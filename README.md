# Lifestream Vault SDK

Official TypeScript SDK for [Lifestream Vault](https://lifestreamdynamics.com) - a multi-user Markdown document storage service with WebDAV sync.

## Installation

```bash
npm install @lifestream-vault/sdk
```

## Quick Start

```typescript
import { LifestreamVaultClient } from '@lifestream-vault/sdk';

// Initialize with API key
const client = new LifestreamVaultClient({
  apiUrl: 'https://your-instance.com/api/v1',
  apiKey: 'lsv_k_your_api_key'
});

// Or with JWT authentication
const client = new LifestreamVaultClient({
  apiUrl: 'https://your-instance.com/api/v1',
  accessToken: 'your_jwt_token'
});

// List vaults
const vaults = await client.vaults.list();

// Create a document
const doc = await client.documents.create('vault-id', {
  path: 'my-note.md',
  content: '# Hello World\n\nThis is my first note!'
});

// Search documents
const results = await client.search.search('vault-id', {
  query: 'hello world'
});
```

## Features

- **Full API Coverage**: Complete TypeScript client for the Lifestream Vault API
- **Type Safety**: Fully typed with TypeScript for excellent IDE support
- **Authentication**: Support for both API keys and JWT tokens
- **Auto Retry**: Built-in retry logic for failed requests
- **Modern**: Built on `ky` HTTP client with ESM support

## API Reference

### Client Initialization

```typescript
interface ClientConfig {
  apiUrl: string;              // Base API URL
  apiKey?: string;             // API key for authentication
  accessToken?: string;        // JWT access token
  timeout?: number;            // Request timeout in ms (default: 30000)
}
```

### Resources

- **`client.vaults`** - Vault management
- **`client.documents`** - Document CRUD operations
- **`client.search`** - Full-text and semantic search
- **`client.apiKeys`** - API key management
- **`client.user`** - User profile and settings
- **`client.subscription`** - Subscription and billing
- **`client.teams`** - Team collaboration
- **`client.ai`** - AI chat sessions
- **`client.hooks`** - Event hooks
- **`client.webhooks`** - Webhook configuration
- **`client.shares`** - Document sharing
- **`client.publish`** - Public publishing
- **`client.connectors`** - External integrations
- **`client.admin`** - Admin operations (requires admin role)

## Documentation

For full API documentation, visit [https://docs.lifestreamdynamics.com](https://docs.lifestreamdynamics.com)

## License

MIT

## Support

- **Issues**: [GitHub Issues](https://github.com/lifestreamdynamics/lifestream-vault-sdk/issues)
- **Email**: eric@lifestreamdynamics.com

// Re-export all resource-specific types from resource modules
export type {
  Vault,
  LinkGraphNode,
  LinkGraphEdge,
  LinkGraphResponse,
  UnresolvedLinkReference,
  UnresolvedLink,
} from '../resources/vaults.js';
export type {
  Document,
  DocumentWithContent,
  DocumentListItem,
  ForwardLinkResult,
  BacklinkResult,
} from '../resources/documents.js';
export type { SearchResult, SearchResponse } from '../resources/search.js';
export type { AiChatSession, AiChatMessage } from '../resources/ai.js';

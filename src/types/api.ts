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

/* Picks the API implementation from VITE_API_MODE (mock | http). Default: mock. */
import type { ApiClient } from './client';
import { createHttpClient } from './http/httpClient';
import { createMockClient } from './mock/mockClient';

export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';

export const api: ApiClient =
  API_MODE === 'http'
    ? createHttpClient(import.meta.env.VITE_API_BASE_URL || '')
    : createMockClient();

export { ApiError } from './client';
export type * from './client';

/* HTTP client for the future Express backend (REST contract in HANDOFF.md). Not used until
   VITE_API_MODE=http. Same ApiClient contract as the mock; identity travels as a bearer token. */
import type { ApiClient } from '../client';
import { ApiError } from '../client';
import { tracked } from '../inspector';

export function createHttpClient(baseUrl: string): ApiClient {
  let token: string | null = null;

  async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
    return tracked(method, path, async () => {
      const res = await fetch(baseUrl.replace(/\/$/, '') + path, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let data: unknown = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!res.ok) {
        const msg = (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string')
          ? data.message : res.status + ' ' + res.statusText;
        throw new ApiError(res.status, msg);
      }
      return data as T;
    });
  }
  const enc = encodeURIComponent;

  return {
    async login(userId) {
      const r = await send<Awaited<ReturnType<ApiClient['login']>>>('POST', '/api/auth/login', { userId });
      token = r.token;
      return r;
    },
    requests: () => send('GET', '/api/requests'),
    createRequest: (data) => send('POST', '/api/requests', data),
    allocate: (id, assignee) => send('PATCH', `/api/requests/${enc(id)}/allocate`, { assignee }),
    saveSpec: (id, changes) => send('PUT', `/api/requests/${enc(id)}/spec`, { changes }),
    submitSpec: (id) => send('POST', `/api/requests/${enc(id)}/submit`, {}),
    decide: (id, ok, note) => send('POST', `/api/requests/${enc(id)}/${ok ? 'approve' : 'return'}`, { note }),
    startCosting: (id, source) => send('POST', `/api/costing/${enc(id)}/start`, { source }),
    chassis: (code) => send('GET', `/api/chassis/${enc(code)}`),
    commodities: (mode) => send('GET', `/api/commodities?source=${enc(mode)}`),
    syncAICM: () => send('POST', '/api/integrations/aicm/sync', {}),
    saveManual: (values) => send('PUT', '/api/commodities/manual', values),
    uploadManual: (fileName) => send('POST', '/api/commodities/manual/upload', { fileName }),
    saveVersion: (reqId, payload) => send('POST', `/api/costing/${enc(reqId)}/versions`, payload),
    versions: () => send('GET', '/api/costing/versions'),
    sapBom: (code) => send('GET', `/api/sap/bom/${enc(code)}?plant=1100&usage=1`),
    sapLpp: (material) => send('GET', `/api/sap/lpp?material=${enc(material)}`),
    scenarios: () => send('GET', '/api/simulations'),
    saveScenario: (sc) => send('POST', '/api/simulations', sc),
    sendMail: (versionId, to) => send('POST', '/api/mail/send', { versionId, to }),
    audit: () => send('GET', '/api/audit?limit=50'),
    resetDemo: () => send('POST', '/api/admin/reset-demo', {}),
  };
}

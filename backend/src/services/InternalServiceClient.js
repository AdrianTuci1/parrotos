import { GoogleAuth } from 'google-auth-library';
import { config } from '../config/index.js';

function isLocalTarget(url) {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '0.0.0.0', 'backend', 'chat', 'harness', 'observer'].includes(parsed.hostname);
  } catch {
    return true;
  }
}

function shouldUseOidc(url) {
  if (config.cloudRunAuthMode === 'disabled') {
    return false;
  }
  if (config.cloudRunAuthMode === 'required') {
    return true;
  }

  if (isLocalTarget(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.run.app');
  } catch {
    return false;
  }
}

function getAudience(url) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

export class InternalServiceClient {
  constructor() {
    this._auth = null;
  }

  getAuth() {
    if (!this._auth) {
      // Only initialize GoogleAuth when OIDC is actually required. In local/dev
      // environments without GCP_PROJECT_ID this constructor would otherwise
      // throw "Unable to detect a Project Id".
      this._auth = new GoogleAuth({ projectId: config.gcpProjectId || undefined });
    }
    return this._auth;
  }

  async buildHeaders(url, extraHeaders = {}) {
    const headers = {
      ...extraHeaders,
      'X-Internal-Token': config.internalToken,
    };

    if (shouldUseOidc(url)) {
      const audience = getAudience(url);
      const client = await this.getAuth().getIdTokenClient(audience);
      const authHeaders = await client.getRequestHeaders(audience);
      return {
        ...headers,
        ...authHeaders,
      };
    }

    return headers;
  }

  async fetch(url, options = {}) {
    const headers = await this.buildHeaders(url, options.headers || {});
    return fetch(url, {
      ...options,
      headers,
    });
  }
}

export const internalServiceClient = new InternalServiceClient();

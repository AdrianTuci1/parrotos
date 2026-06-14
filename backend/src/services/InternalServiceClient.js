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
    this.auth = new GoogleAuth({ projectId: config.gcpProjectId });
  }

  async buildHeaders(url, extraHeaders = {}) {
    const headers = {
      ...extraHeaders,
      'X-Internal-Token': config.internalToken,
    };

    if (!shouldUseOidc(url)) {
      return headers;
    }

    const audience = getAudience(url);
    const client = await this.auth.getIdTokenClient(audience);
    const authHeaders = await client.getRequestHeaders(audience);
    return {
      ...headers,
      ...authHeaders,
    };
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

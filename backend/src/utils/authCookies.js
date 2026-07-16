import { config } from '../config/index.js';

export function parseCookieHeader(header = '') {
  return String(header || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      cookies[key] = value;
      return cookies;
    }, {});
}

function getCookieDomain(req) {
  if (config.refreshCookieDomain) {
    return config.refreshCookieDomain;
  }

  if (config.nodeEnv !== 'production') {
    return undefined;
  }

  // Derive parent domain from the request host so the refresh cookie is sent
  // across subdomains (e.g. api.statsparrot.com -> .statsparrot.com).
  const host = req?.headers?.host?.split(':')[0] || '';
  const parts = host.split('.');
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`;
  }

  return undefined;
}

function buildCookieOptions(req, maxAge = 0) {
  const options = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.refreshCookieSameSite || 'lax',
    path: `${config.apiPrefix}/auth`,
    maxAge,
  };

  const domain = getCookieDomain(req);
  if (domain) {
    options.domain = domain;
  }

  return options;
}

export function setRefreshTokenCookie(res, refreshToken, req) {
  res.cookie(
    config.refreshCookieName,
    refreshToken,
    buildCookieOptions(req, config.refreshTokenTtlMs),
  );
}

export function clearRefreshTokenCookie(res, req) {
  res.clearCookie(
    config.refreshCookieName,
    buildCookieOptions(req, 0),
  );
}

export function getRefreshTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[config.refreshCookieName] || null;
}

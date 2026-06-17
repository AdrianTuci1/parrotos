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

function buildCookieOptions(maxAge = 0) {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: `${config.apiPrefix}/auth`,
    maxAge,
    ...(config.refreshCookieDomain ? { domain: config.refreshCookieDomain } : {}),
  };
}

export function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(
    config.refreshCookieName,
    refreshToken,
    buildCookieOptions(config.refreshTokenTtlMs),
  );
}

export function clearRefreshTokenCookie(res) {
  res.clearCookie(
    config.refreshCookieName,
    buildCookieOptions(0),
  );
}

export function getRefreshTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[config.refreshCookieName] || null;
}

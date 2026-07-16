import { Router } from 'express';
import { config } from '../config/index.js';
import { AuthService } from '../services/AuthService.js';
import { BadRequestError } from '../utils/errors.js';
import { setRefreshTokenCookie } from '../utils/authCookies.js';

const router = Router();
const authService = new AuthService();

/**
 * GET /api/v1/auth/google
 * Redirects user to Google's OAuth 2.0 consent screen.
 */
router.get('/google', (req, res) => {
  if (!config.googleClientId) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  const state = Buffer.from(JSON.stringify({
    redirect: req.query.redirect || '/app/home',
    nonce: Math.random().toString(36).substring(2),
  })).toString('base64url');

  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(url);
});

/**
 * GET /api/v1/auth/google/callback
 * Handles the OAuth callback from Google.
 */
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, state, error: googleError } = req.query;

    if (googleError) {
      throw new BadRequestError(`Google OAuth error: ${googleError}`);
    }

    if (!code) {
      throw new BadRequestError('Missing authorization code');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new BadRequestError(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    // Fetch user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      throw new BadRequestError(`Failed to fetch user info: ${userData.error_description || userData.error}`);
    }

    // Find or create user
    const result = await authService.findOrCreateOAuthUser({
      email: userData.email,
      username: userData.name || userData.email.split('@')[0],
      picture: userData.picture,
      provider: 'google',
      providerId: userData.sub,
    });

    // Parse state for redirect
    let redirectUrl = '/app/home';
    try {
      const stateObj = JSON.parse(Buffer.from(state, 'base64url').toString());
      if (stateObj.redirect) redirectUrl = stateObj.redirect;
    } catch {
      // ignore invalid state
    }

    setRefreshTokenCookie(res, result.refreshToken, req);
    // Redirect to /login so LoginView can extract the token from the URL.
    // The redirectUrl is passed separately so LoginView can navigate there after setting the token.
    const loginUrl = `${config.frontendUrl}/login?token=${encodeURIComponent(result.token)}&redirect=${encodeURIComponent(redirectUrl)}`;
    res.redirect(loginUrl);
  } catch (err) {
    next(err);
  }
});

export default router;

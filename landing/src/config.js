/**
 * The hosted app the marketing site sends visitors to. `VITE_APP_URL` is set at build time by
 * the deploy workflow; the fallback matches the default Terraform subdomain in
 * `deploy/terraform/lightsail`.
 */
export const APP_URL = (import.meta.env.VITE_APP_URL || "https://bi.statsparrot.com").replace(/\/+$/, "");

/** Signing in goes straight to the login route, which redirects to the OIDC provider. */
export const SIGN_IN_URL = `${APP_URL}/auth/login`;

/** Contact address for sales and beta requests. */
export const CONTACT_EMAIL = "hello@statsparrot.com";

import React from 'react';

// Spreadsheets Logo (Google Sheets style)
const SpreadsheetsLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-white">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm0-4H7v-2h5v2zm0-4H7V7h5v2zm5 8h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2z" />
  </svg>
);

// Presentations Logo (Google Slides style)
const PresentationsLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-white">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" />
  </svg>
);

// NVIDIA Logo (Sleek spiral eye)
const NvidiaLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.97 3C7.01 3 3 7.01 3 11.97c0 4.14 2.8 7.62 6.63 8.65l-1.07-1.07c-2.73-.91-4.71-3.48-4.71-6.51A7.12 7.12 0 0111 4v2.03a5.09 5.09 0 00-4 4.97c0 2.2 1.39 4.07 3.36 4.77l-1.07-1.07A3.05 3.05 0 018.5 11c0-1.25 0.77-2.31 1.86-2.74l1.61 1.61V3z" fill="#76B900" />
  </svg>
);

// Linear Logo
const LinearLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2 15h-4v-2h4v2zm2-4H8v-2h8v2zm-1-4H9V7h6v2z" />
  </svg>
);

// Notion Logo
const NotionLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-black" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.6 2h14.8c1.4 0 2.6 1.2 2.6 2.6v14.8c0 1.4-1.2 2.6-2.6 2.6H4.6C3.2 22 2 20.8 2 19.4V4.6C2 3.2 3.2 2 4.6 2zm4 4.2H7V17.8h1.6V10.2l6.2 7.6h1.6V6.2h-1.6v7.6L9.6 6.2z" />
  </svg>
);

// Gmail Logo
const GmailLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
    <path fill="#ffffff" d="M22 6v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6l10 6.5L22 6z" />
    <path fill="#EA4335" d="M2 6l10 6.5L22 6v-1c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v1z" />
  </svg>
);

// Google Calendar Logo
const GoogleCalendarLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="4" fill="#4285F4" />
    <rect x="5" y="7" width="14" height="12" rx="2" fill="#ffffff" />
    <text x="12" y="16" fontFamily="Arial, Helvetica, sans-serif" fontSize="9" fontWeight="bold" fill="#4285F4" textAnchor="middle">31</text>
  </svg>
);

// Google Drive Logo
const GoogleDriveLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5.5 h-5.5" xmlns="http://www.w3.org/2000/svg">
    <path fill="#00A1E0" d="M19 13H5v-2h14v2z" />
    <path fill="#0066DA" d="M19.43 12.98L12.99 1.83H6.56l6.43 11.15z" />
    <path fill="#34A853" d="M9.72 17.8l-3.21-5.56H.08l3.21 5.56z" />
    <path fill="#FFD000" d="M13.67 17.8H4.02L.81 23.36h9.65z" />
  </svg>
);

// Stripe Logo SVG
const StripeLogo = () => (
  <svg viewBox="0 0 32 32" className="w-6 h-6 fill-white">
    <path d="M13.882 14.945c0-1.748 1.393-2.316 3.73-2.316 2.766 0 5.485.836 7.424 1.835v-5.27c-2.148-.87-4.81-1.28-7.142-1.28-6.177 0-10.278 3.195-10.278 8.618 0 8.355 11.455 6.99 11.455 10.606 0 1.942-1.637 2.535-4.24 2.535-3.19 0-6.23-1.077-8.318-2.128v5.39c2.477 1.07 5.717 1.545 8.257 1.545 6.398 0 10.606-3.076 10.606-8.796 0-8.877-11.794-7.247-11.794-10.47z" />
  </svg>
);

// Shopify Logo SVG
const ShopifyLogo = () => (
  <svg viewBox="0 0 150 150" className="w-7 h-7">
    <path fill="#95BF47" d="M124.6 47.9c-.8-.7-1.9-.9-2.9-.4L105 55.7l-4.9-18.7c-.5-1.9-2.2-3.2-4.1-3.2H54.1c-1.9 0-3.6 1.3-4.1 3.2L45 55.7 28.3 47.5c-1-.5-2.1-.3-2.9.4-.8.7-1.1 1.9-.8 2.9l19.2 68.3c.6 2.1 2.5 3.6 4.7 3.6h53.1c2.2 0 4.1-1.5 4.7-3.6l19.2-68.3c.2-1-.1-2.2-.9-2.9zm-49.6-9.1h25c.9 0 1.6.6 1.8 1.5l3.8 14.5H41.4l3.8-14.5c.2-.9.9-1.5 1.8-1.5h25z" />
  </svg>
);

// PostHog Logo SVG
const PostHogLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#F1A818]">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-5-3.5c-.83 0-1.5-.67-1.5-1.5S10.67 8 11.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-4 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
  </svg>
);

// Prometheus Logo SVG
const PrometheusLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#E6522C]">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 11.5c-2.48 0-4.5-2.02-4.5-4.5S9.52 4.5 12 4.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5z" />
  </svg>
);

// HubSpot Logo SVG
const HubSpotLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#FF7A59]">
    <path d="M18.8 10.3c-.6 0-1.1-.3-1.4-.8l-3.3 1c0 .2.1.4.1.6 0 .5-.1 1-.3 1.4l2.1 2.8c.4-.2.8-.3 1.3-.3 1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5-2.5-1.1-2.5-2.5c0-.6.2-1.2.6-1.6l-2.1-2.8c-.4.2-.9.3-1.4.3-.2 0-.4 0-.6-.1l-1 3.3c.5.3.8.8.8 1.4 0 1.1-.9 2-2 2s-2-.9-2-2c0-.6.3-1.1.8-1.4l1-3.3c-.2 0-.4-.1-.6-.1-.5 0-1 .1-1.4.3l-2.8-2.1c.2-.4.3-.8.3-1.3 0-1.4-1.1-2.5-2.5-2.5S0 8.9 0 10.3s1.1 2.5 2.5 2.5c.6 0 1.2-.2 1.6-.6l2.8 2.1c-.2.4-.3.9-.3 1.4 0 .2 0 .4.1.6l-3.3 1c-.3-.5-.8-.8-1.4-.8-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2c0-.6-.3-1.1-.8-1.4l3.3-1c0-.2-.1-.4-.1-.6 0-.5.1-1 .3-1.4L4.8 10c-.4.2-.8.3-1.3.3-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5c1 0 1.8.6 2.2 1.4l2.8-2.1C8.2 5 8.1 4.5 8.1 4c0-1.1.9-2 2-2s2 .9 2 2c0 .6-.3 1.1-.8 1.4l1 3.3c.2 0 .4.1.6.1.5 0 1-.1 1.4-.3l2.8 2.1c-.2.4-.3.8-.3 1.3 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0-1-.6-1.8-1.4-2.2z" />
  </svg>
);

// Google Ads / Google Logo SVG
const GoogleAdsLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.23-.67-.35-1.37-.35-2.09L5.84 14.09z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

// Slack Logo SVG
const SlackLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <path fill="#e01e5a" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042z" />
    <path fill="#36c5f0" d="M8.823 5.043a2.528 2.528 0 0 1-2.52-2.52 2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.52 2.522v2.52h-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.78a2.528 2.528 0 0 1-2.52-2.522V8.824a2.528 2.528 0 0 1 2.52-2.52h5.043z" />
    <path fill="#2eb67d" d="M18.958 8.824a2.528 2.528 0 0 1 2.522-2.52 2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.52h-2.522v-2.52zm-1.261 0a2.528 2.528 0 0 1-2.522 2.52h-5.043a2.528 2.528 0 0 1-2.52-2.52V3.781a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043z" />
    <path fill="#ecb22e" d="M15.177 18.957a2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm0-1.261a2.528 2.528 0 0 1-2.52-2.522V10.13a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.044a2.528 2.528 0 0 1-2.52 2.522h-5.043z" />
  </svg>
);

// GitHub Logo SVG
const GitHubLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

// Discord Logo SVG
const DiscordLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
    <path d="M19.27 4.73a16.14 16.14 0 0 0-3.97-1.23.08.08 0 0 0-.08.04 11.23 11.23 0 0 0-.49 1.01 14.88 14.88 0 0 0-5.46 0 11.23 11.23 0 0 0-.49-1.01.08.08 0 0 0-.08-.04 16.14 16.14 0 0 0-3.97 1.23.08.08 0 0 0-.03.03C1.67 9.87.82 14.86 1.23 19.82a.08.08 0 0 0 .03.06 16.27 16.27 0 0 0 4.9 2.49.08.08 0 0 0 .09-.03c.38-.52.71-1.07.99-1.66a.08.08 0 0 0-.04-.1 10.6 10.6 0 0 1-1.54-.74.08.08 0 0 1-.01-.13c.1-.08.2-.16.3-.24a.08.08 0 0 1 .08-.01c3.21 1.47 6.69 1.47 9.85 0a.08.08 0 0 1 .08.01c.1.08.2.16.3.24a.08.08 0 0 1-.01.13c-.48.28-.99.53-1.54.74a.08.08 0 0 0-.04.1c.28.59.61 1.14.99 1.66a.08.08 0 0 0 .09.03 16.27 16.27 0 0 0 4.9-2.49.08.08 0 0 0 .03-.06c.49-5.69-.84-10.62-3.41-15.06a.08.08 0 0 0-.03-.03zM8.52 14.85a1.73 1.73 0 0 1-1.63-1.73c0-.96.72-1.73 1.63-1.73s1.64.77 1.63 1.73c0 .96-.72 1.73-1.63 1.73zm6.96 0a1.73 1.73 0 0 1-1.63-1.73c0-.96.72-1.73 1.63-1.73s1.64.77 1.63 1.73c0 .96-.72 1.73-1.63 1.73z" />
  </svg>
);

// Salesforce Logo SVG
const SalesforceLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
  </svg>
);

// PostgreSQL Logo SVG (Generic DB shape that looks highly professional)
const PostgresqlLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
    <path d="M12 2C6.48 2 2 4.02 2 6.5s4.48 4.5 10 4.5 10-2.02 10-4.5S17.52 2 12 2zm0 11c-5.52 0-10-2.02-10-4.5v3.5c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5v-3.5c0 2.48-4.48 4.5-10 4.5zm0 5c-5.52 0-10-2.02-10-4.5v3.5c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5v-3.5c0 2.48-4.48 4.5-10 4.5z" />
  </svg>
);

// Snowflake Logo SVG
const SnowflakeLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#29B6F6]">
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    <polyline points="10 9 12 7 14 9" />
    <polyline points="14 15 12 17 10 15" />
    <polyline points="9 10 7 12 9 14" />
    <polyline points="15 14 17 12 15 10" />
  </svg>
);

const connectorImageMap = {
  stripe: 'stripe.png',
  ga4: 'ga4.png',
  'search console': 'search-console.png',
  'google ads': 'google-ads.png',
  'meta ads': 'facebook-ads.png',
  'tiktok ads': 'tiktok-ads.png',
  shopify: 'shopify.png',
  woocommerce: 'woocommerce.png',
  hubspot: 'hubspot.png',
  mongodb: 'mongodb.png',
  mysql: 'mysql.png',
  postgresql: 'postgres.png',
  prometheus: 'prometheus.png',
  sentry: 'sentry.png',
  salesforce: 'salesforce.png',
  github: 'github.png',
  slack: 'slack.png',
  discord: 'discord.png',
  intercom: 'intercom.png',
  resend: 'resend.png',
};

const logoMap = {
  spreadsheets: {
    svg: <SpreadsheetsLogo />,
    bg: '#107c41',
  },
  presentations: {
    svg: <PresentationsLogo />,
    bg: '#c43c13',
  },
  nvidia: {
    svg: <NvidiaLogo />,
    bg: '#000000',
  },
  linear: {
    svg: <LinearLogo />,
    bg: '#121212',
  },
  notion: {
    svg: <NotionLogo />,
    bg: '#ffffff',
  },
  gmail: {
    svg: <GmailLogo />,
    bg: '#ffffff',
  },
  'google calendar': {
    svg: <GoogleCalendarLogo />,
    bg: '#ffffff',
  },
  'google drive': {
    svg: <GoogleDriveLogo />,
    bg: '#ffffff',
  },
  stripe: {
    svg: <StripeLogo />,
    bg: '#635BFF',
  },
  shopify: {
    svg: <ShopifyLogo />,
    bg: '#ffffff',
  },
  posthog: {
    svg: <PostHogLogo />,
    bg: '#111111',
  },
  prometheus: {
    svg: <PrometheusLogo />,
    bg: '#1a1e29',
  },
  hubspot: {
    svg: <HubSpotLogo />,
    bg: '#FF7A59',
  },
  'google ads': {
    svg: <GoogleAdsLogo />,
    bg: '#ffffff',
  },
  slack: {
    svg: <SlackLogo />,
    bg: '#ffffff',
  },
  github: {
    svg: <GitHubLogo />,
    bg: '#181818',
  },
  discord: {
    svg: <DiscordLogo />,
    bg: '#5865F2',
  },
  salesforce: {
    svg: <SalesforceLogo />,
    bg: '#00A1E0',
  },
  postgresql: {
    svg: <PostgresqlLogo />,
    bg: '#336791',
  },
  mysql: {
    svg: <PostgresqlLogo />,
    bg: '#00758F',
  },
  snowflake: {
    svg: <SnowflakeLogo />,
    bg: '#161920',
  },
};

/**
 * Returns the logo SVG and background color for a given connector name.
 * If not found, returns null (rendering a blank container, per "lasi chenar gol daca nu avem imagine").
 */
/** Returns the PNG image path from public/connectors for the given connector name, or null. */
export function getConnectorImage(connectorName) {
  if (!connectorName) return null;
  const key = connectorName.toLowerCase();
  const filename = connectorImageMap[key];
  return filename ? `/connectors/${filename}` : null;
}

export function getIntegrationLogo(connectorName) {
  if (!connectorName) return null;
  const key = connectorName.toLowerCase();
  return logoMap[key] || null;
}

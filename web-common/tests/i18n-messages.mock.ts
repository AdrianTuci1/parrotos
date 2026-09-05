// Stub for the generated `@rilldata/web-common/lib/i18n/gen/messages` module.
// Paraglide produces this file at build time (`build:i18n`) and it is not present
// in a test checkout. Any message helper returns its key, so unit tests on the
// React/Svelte components do not need the generated bundle.
const m = new Proxy(
  {},
  {
    get: (_target, prop) => () => prop,
  },
);

export { m };

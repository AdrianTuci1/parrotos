/**
 * Stand-in for SvelteKit's `$app/environment` virtual module. The React host is
 * browser-only, so `browser` is always true and the lifecycle flags are false.
 */
export const browser = true;
export const dev = false;
export const building = false;
export const preview = false;
export const version = "";

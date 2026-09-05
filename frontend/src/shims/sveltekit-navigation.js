/**
 * Stand-in for SvelteKit's `$app/navigation` virtual module. The React host performs
 * client navigation through react-router, so these are no-ops that keep the Rill
 * code that imports them (cache invalidation) from throwing.
 */
export async function goto() {}
export async function invalidate() {}
export async function invalidateAll() {}
export async function prefetch() {}
export async function prefetchRoutes() {}

/**
 * Stand-in for SvelteKit's `$app/stores` virtual module. Provides reactive stores
 * that the Rill chart/mapping code reads; in this host the page data never comes
 * from SvelteKit, so they hold empty defaults.
 */
import { writable } from "svelte/store";

export const page = writable({ url: null, params: {}, data: {} });
export const navigating = writable(null);
export const updated = writable(false);

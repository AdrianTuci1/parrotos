import { parse, stringify } from "yaml";
import {
  loadCanvas as loadLocal,
  saveCanvas as saveLocal,
  defaultCanvas,
  normalizeCanvasModel,
} from "@/data/mockCanvas";
import {
  runtimeServiceGetFile,
  runtimeServicePutFile,
} from "@statsparrot/web-common/runtime-client";

const FILE_DIR = "dashboards";
const filePath = (name) => `${FILE_DIR}/${name}.yaml`;

/**
 * Canvas persistence transport.
 *
 * A transport reads/writes a canvas model by name. The default transport uses
 * localStorage, so the interactive builder works offline/in mock mode. When a Parrot
 * runtime is reachable a runtime-backed transport is installed (see
 * buildRuntimeTransport) so canvases persist to `dashboards/<name>.yaml` on disk,
 * matching Parrot's repo file layout. The rest of the app talks only to
 * loadCanvas()/saveCanvas(), so switching backends is a one-line swap.
 */
let transport = { read: loadLocal, write: saveLocal };

export function setCanvasTransport(next) {
  if (next) transport = next;
}

export function resetCanvasTransport() {
  transport = { read: loadLocal, write: saveLocal };
}

export function getCanvasTransport() {
  return transport;
}

/**
 * Build a transport that round-trips the model through the runtime file API as YAML.
 * The runtime returns the file content as plain text (`blob`), so we parse/stringify
 * with the `yaml` package. Parrot can then reconcile the canvas from `dashboards/<name>.yaml`
 * exactly as it does for a hand-authored canvas.
 */
export function buildRuntimeTransport(client) {
  return {
    async read(name) {
      const res = await runtimeServiceGetFile(client, { path: filePath(name) });
      if (!res.blob) return defaultCanvas(name);
      return normalizeCanvasModel(parse(res.blob));
    },
    async write(name, model) {
      await runtimeServicePutFile(client, { path: filePath(name), blob: stringify(model) });
    },
  };
}

/** Load a canvas through the current transport (localStorage or runtime). */
export async function loadCanvas(name) {
  return transport.read(name);
}

/** Persist a canvas through the current transport; errors are non-fatal for the builder. */
export function saveCanvas(name, model) {
  try {
    transport.write(name, model);
  } catch {
    // Quota/network errors should not interrupt editing; the model stays in memory.
  }
}

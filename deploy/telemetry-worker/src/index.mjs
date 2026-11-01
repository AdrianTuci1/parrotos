// Telemetry ingest for Statsparrot.
//
// The CLI keeps events on disk and drains them in batches: one request carries
// up to `MAX_BATCH` events, and the Worker writes one NDJSON object per batch
// into R2. That keeps both halves of the bill small — one request per drain
// instead of one per event, and one object per batch instead of one object per
// event.
//
// The wire type is the client's queued item:
//
//   {"kind":"event","value":{...Event...}}
//
// `value` is the event the runtime's activity package emits: `event_id` (a
// UUID), `event_time` (RFC3339), `event_type`, `event_name` and a flat payload
// of type-specific fields.
//
// A batch is a JSON array of event items. A single item is accepted too, so a
// client that does not batch yet keeps working. `kind` is the discriminator: an
// item that is not a `kind:"event"` is counted as `dropped`, never stored.
// Statsparrot has no crash reports, so there is no `/v1/crashes`.
//
// Layout in the bucket:
//
//   <prefix>/events/dt=YYYY-MM-DD/hour=HH/batch-<first-id>-<last-id>.jsonl
//
// The key is derived from the batch's own event ids, so a retry after a
// timeout overwrites the same object instead of adding a second copy. The day
// and hour come from the event's `event_time`, never from the Worker's clock:
// an event queued offline for two days lands in the partition it happened in.

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_BATCH = 200;

// Canonical UUIDs only: eight hex digits, three groups of four, twelve. The CLI
// generates `uuid.New().String()`, so nothing else should reach the bucket.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// RFC3339 with a mandatory offset, which is what `Event.MarshalJSON` writes.
const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/v1/health")) {
      return health(env);
    }

    if (request.method !== "POST") {
      return json({ error: "method not allowed" }, 405, { allow: "GET, POST" });
    }

    if (!authorised(request, env)) {
      return json({ error: "a collector token is required" }, 401);
    }

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json({ error: "body too large" }, 413);
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return json({ error: "body is not JSON" }, 400);
    }

    try {
      if (url.pathname === "/v1/events") {
        return await ingestEvents(payload, env);
      }
      return json({ error: "not found" }, 404);
    } catch (error) {
      // A storage failure is retryable: the client keeps the batch and sends it
      // again, and the deterministic key makes the retry idempotent.
      console.error("telemetry: the bucket write failed", error);
      return json({ error: "could not store the batch" }, 503, { "retry-after": "5" });
    }
  },
};

async function ingestEvents(payload, env) {
  const items = Array.isArray(payload) ? payload : [payload];
  if (items.length > MAX_BATCH) {
    return json({ error: `a batch carries at most ${MAX_BATCH} events` }, 413);
  }

  const receivedAt = new Date().toISOString();
  const groups = new Map();
  let dropped = 0;

  for (const item of items) {
    if (!item || item.kind !== "event" || !item.value || typeof item.value !== "object") {
      dropped += 1;
      continue;
    }

    const value = item.value;
    if (typeof value.event_id !== "string" || !UUID.test(value.event_id)) {
      dropped += 1;
      continue;
    }

    if (typeof value.event_type !== "string" || !value.event_type) {
      dropped += 1;
      continue;
    }

    if (typeof value.event_name !== "string" || !value.event_name) {
      dropped += 1;
      continue;
    }

    if (typeof value.event_time !== "string" || !ISO8601.test(value.event_time)) {
      dropped += 1;
      continue;
    }

    const when = new Date(value.event_time);
    if (Number.isNaN(when.getTime())) {
      dropped += 1;
      continue;
    }

    // `toISOString` normalises offsets; the partition is always UTC.
    const iso = when.toISOString();
    const partition = `${iso.slice(0, 10)}/${iso.slice(11, 13)}`;
    if (!groups.has(partition)) {
      groups.set(partition, []);
    }
    groups.get(partition).push({ ...value, received_at: receivedAt });
  }

  let written = 0;
  for (const [partition, events] of groups) {
    const [day, hour] = partition.split("/");
    const ids = events.map((event) => event.event_id);
    const key = eventKey(prefix(env), day, hour, ids);
    const body = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
    await env.TELEMETRY.put(key, body, {
      httpMetadata: {
        contentType: "application/x-ndjson",
        contentDisposition: "attachment",
      },
    });
    written += events.length;
  }

  if (dropped > 0) {
    console.warn(`telemetry: accepted ${written} events, dropped ${dropped} malformed items`);
  }

  return json({ accepted: written, dropped }, 202);
}

function health(env) {
  const configured = Boolean(env.TELEMETRY);
  return json({
    status: "ok",
    schema: 2,
    service: "statsparrot-telemetry",
    batch_max: MAX_BATCH,
    bucket: configured ? "configured" : "missing",
  }, configured ? 200 : 500);
}

export function prefix(env) {
  return String(env.RAW_PREFIX ?? "raw").trim().replace(/^\/+|\/+$/g, "");
}

export function eventKey(root, day, hour, ids) {
  const sorted = [...ids].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return join(root, "events", `dt=${day}`, `hour=${hour}`, `batch-${first}-${last}.jsonl`);
}

function join(...parts) {
  return parts.filter((part) => part !== "").join("/");
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function authorised(request, env) {
  const expected = env.STATSPARROT_TELEMETRY_TOKEN;
  if (!expected) {
    return true;
  }

  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const presented = request.headers.get("x-statsparrot-token") ?? bearer;
  if (!presented || presented.length !== expected.length) {
    return false;
  }

  // A shared token is a speed bump, not a password. Comparing every byte keeps
  // its length from being measurable through timing.
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= presented.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

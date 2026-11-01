# Telemetry ingest

The Worker behind `https://telemetry.statsparrot.com`. It receives the batches
the CLI drains from its on-disk telemetry queue and writes them to R2.

There is one request per batch and one object per batch. That is the whole cost
story: at 30 million events a month, 100 events per request is 300,000 requests
and 300,000 objects, instead of 30 million of each.

## Protocol

`POST /v1/events` takes a JSON array of the CLI's queued items:

```json
[
  {
    "kind": "event",
    "value": {
      "event_id": "8cb858a4-2d5a-4a80-ae9b-fb5b905f18a2",
      "event_time": "2026-11-01T20:10:00Z",
      "event_type": "behavioral",
      "event_name": "app-start",
      "install_id": "…",
      "service_version": "0.52.2"
    }
  }
]
```

A single item is accepted too, so a client that does not batch yet keeps
working. A batch carries at most 200 events and a body at most 1 MiB.

`kind` is the discriminator. Only `kind:"event"` items are stored; anything else
(including a `kind:"crash"`) is counted in `dropped`. Statsparrot has no crash
reports, so there is no `/v1/crashes` endpoint.

Every `value` needs four fields:

| Field | Type | Notes |
|---|---|---|
| `event_id` | string | canonical UUID, used for the object key |
| `event_type` | string | `log`, `metric`, `behavioral`, … |
| `event_name` | string | `app-start`, `deploy-success`, … |
| `event_time` | string | RFC3339/ISO8601 with an offset, drives the partition |

Anything else in `value` is payload and is stored verbatim. A malformed item is
dropped and counted, never a reason to fail the batch.

Responses:

| Status | When |
|---|---|
| `202` | `{"accepted":n,"dropped":m}` — the batch is in R2 |
| `400` | the body is not JSON |
| `401` | a token is configured and the request carries the wrong one |
| `404` | an unknown path (including `/v1/crashes`) |
| `405` | not a `GET` or `POST` |
| `413` | the body is over 1 MiB, or the batch has more than 200 items |
| `503` | the bucket write failed; `retry-after: 5`, the client retries the batch |

Authentication is optional. If the `STATSPARROT_TELEMETRY_TOKEN` secret is set,
a request must carry it as `x-statsparrot-token: <token>` or
`Authorization: Bearer <token>`. If the secret is unset, anonymous posts are
accepted, which is the default today.

`GET /` and `GET /v1/health` answer without touching the bucket:

```json
{"status":"ok","schema":2,"service":"statsparrot-telemetry","batch_max":200,"bucket":"configured"}
```

`bucket` is `missing` (with a `500`) when the R2 binding is absent.

## Layout

```
raw/events/dt=YYYY-MM-DD/hour=HH/batch-<first-id>-<last-id>.jsonl
```

Each line is the item's `value` with one extra field, `received_at`. The day and
hour come from the event's `event_time` in UTC, never from the Worker's clock,
so an event queued offline for two days lands in the partition it happened in.

The object key is derived from the batch's own event ids (sorted, first and
last). A retry after a timeout overwrites the same object instead of adding a
second copy; an event id therefore appears at most once per object, and a
retried batch never double-counts.

## Deploy

```sh
npx wrangler r2 bucket create statsparrot-telemetry   # once
npx wrangler deploy
npx wrangler secret put STATSPARROT_TELEMETRY_TOKEN   # optional: reject anonymous posts
```

The custom domain is declared in `wrangler.toml`; Wrangler creates the DNS
record in the `statsparrot.com` zone. `workers_dev` and `preview_urls` are off,
so the custom domain is the only way in and the bucket stays private.

The bucket carries a 400-day lifecycle rule, so telemetry does not accumulate
forever:

```sh
npx wrangler r2 bucket lifecycle add statsparrot-telemetry raw-telemetry \
  --expire-days 400 --prefix raw/
```

## Cost

A CLI session emits a handful of events (install, app-start, login,
deploy-success), so a session produces a couple of objects, not a couple of
dozen requests.

| Item | Price | At Statsparrot's volume |
|---|---|---|
| R2 storage | $0.015/GB-month | a few MB, well under a cent |
| R2 Class A (writes) | $4.50/million | a few thousand objects/month, cents |
| R2 Class B (reads) | $0.36/million | only when queried, cents |
| Egress | $0.00 | free |

A few events per CLI session is cents per month, most of it a rounding error
next to the Workers paid plan. The batching is still what keeps it there: one
object per event instead of one per batch would multiply the Class A line by the
batch size, and the 400-day rule is what keeps storage from growing with the
install base.

R2's Infrequent Access class applies to a whole bucket, not to individual
objects, so there is no per-object transition: Standard is $0.015/GB-month and
Infrequent Access is $0.01/GB-month if the data is rarely read.

## Querying

R2 is S3-compatible, so DuckDB reads the layout directly:

```sql
INSTALL httpfs;
LOAD httpfs;
SET s3_endpoint = '<account-id>.r2.cloudflarestorage.com';
SET s3_access_key_id = '…';
SET s3_secret_access_key = '…';
SET s3_region = 'auto';

SELECT event_type, event_name, count(*) AS events
FROM read_json_auto(
  's3://statsparrot-telemetry/raw/events/dt=2026-11-*/*/*.jsonl',
  hive_partitioning = true
)
GROUP BY event_type, event_name
ORDER BY events DESC;
```

With `hive_partitioning` on, `dt` and `hour` come from the path without parsing
the key, and `event_time` gives the exact timestamp. The prefix in the query
matches `RAW_PREFIX` in `wrangler.toml`; change both together.

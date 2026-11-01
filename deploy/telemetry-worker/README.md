# Telemetry ingest

The Worker behind `https://telemetry.statsparrot.com`. It receives the batches
the CLI drains from its on-disk telemetry queue and writes them to S3.

There is one request per batch and one object per batch. That is the whole cost
story: at 30 million events a month, 100 events per request is 300,000 requests
and 300,000 objects, instead of 30 million of each.

## Storage

The bucket is shared with the other staticlabs projects. Statsparrot owns one
prefix and writes nothing else in it.

| Field | Value |
|---|---|
| Bucket | `staticlabs-data` |
| Region | `eu-central-1` |
| Project prefix | `statsparrot/telemetry` |
| Public access | blocked (bucket-level) |
| Encryption | SSE-S3 (bucket-level) |
| Retention | needs its own lifecycle rule, see below |

The Worker authenticates with SigV4 (`aws4fetch`) as an IAM writer whose policy
allows `s3:PutObject` on `arn:aws:s3:::staticlabs-data/statsparrot/telemetry/*`
and nothing else. The key lives in the Worker secrets `AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY`; it can neither read nor list, which is why querying
uses the operator profile.

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
working. `kind` is the discriminator: an item that is not a `kind:"event"` is
counted as `dropped`, never stored. Statsparrot has no crash reports, so there
is no `/v1/crashes`.

| Answer | Meaning |
|---|---|
| `202` | `{"accepted":n,"dropped":m}` — the batch is in S3 |
| `400` | the body is not JSON |
| `401` | the collector token is required and missing or wrong |
| `404` | unknown path |
| `405` | not `GET` or `POST` |
| `413` | more than 200 events or more than 1 MiB (`retry-after: 5`) |
| `503` | the S3 write failed; `retry-after: 5`, the client retries the batch |

Authentication is optional. If the `STATSPARROT_TELEMETRY_TOKEN` secret is set,
a request must carry it as `x-statsparrot-token: <token>` or
`Authorization: Bearer <token>`. If the secret is unset, anonymous posts are
accepted, which is the default today.

`GET /` and `GET /v1/health` answer without touching the bucket:

```json
{"status":"ok","schema":2,"service":"statsparrot-telemetry","batch_max":200,"storage":"s3","bucket":"staticlabs-data","prefix":"statsparrot/telemetry"}
```

`bucket` is `missing` (with a `500`) when the credentials are absent.

## Layout

```
statsparrot/telemetry/events/dt=YYYY-MM-DD/hour=HH/batch-<first-id>-<last-id>.jsonl
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
npx wrangler deploy
npx wrangler secret put AWS_ACCESS_KEY_ID
npx wrangler secret put AWS_SECRET_ACCESS_KEY
npx wrangler secret put STATSPARROT_TELEMETRY_TOKEN   # optional: reject anonymous posts
```

The custom domain is declared in `wrangler.toml`; Wrangler creates the DNS
record in the `statsparrot.com` zone. `workers_dev` and `preview_urls` are off,
so the custom domain is the only way in and the bucket stays private.

The bucket-level lifecycle rules match a prefix, so retention for Statsparrot is
its own rule. Add it once, and do not widen the existing `octomus/telemetry/`
rule:

```sh
aws s3api put-bucket-lifecycle-configuration --bucket staticlabs-data \
  --region eu-central-1 --lifecycle-configuration file:///tmp/lifecycle.json
```

with the existing rules plus:

```json
{
  "ID": "statsparrot-telemetry-retention",
  "Status": "Enabled",
  "Filter": { "Prefix": "statsparrot/telemetry/" },
  "Expiration": { "Days": 400 },
  "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 1 }
}
```

## Cost

A CLI session emits a handful of events (install, app-start, login,
deploy-success), so a session produces a couple of objects, not a couple of
dozen requests.

| Item | Price (eu-central-1) | At Statsparrot's volume |
|---|---|---|
| S3 storage | $0.0245/GB-month | a few MB, well under a cent |
| S3 PUT | $0.0054/1,000 | a few thousand objects/month, cents |
| S3 GET | $0.00043/1,000 | only when queried, cents |
| Worker requests | free under 100,000/day | far below the free plan |
| Transfer into S3 | $0.00 | free |

The batching is what keeps it there: one object per event instead of one per
batch would multiply the PUT line by the batch size, and the 400-day rule is
what keeps storage from growing with the install base.

## Querying

Query with the operator profile, not the writer key:

```sh
aws s3 ls s3://staticlabs-data/statsparrot/telemetry/events/dt=2026-11-01/
```

DuckDB reads the layout in place:

```sql
INSTALL httpfs;
LOAD httpfs;
SET s3_region = 'eu-central-1';

SELECT event_type, event_name, count(*) AS events
FROM read_json_auto(
  's3://staticlabs-data/statsparrot/telemetry/events/dt=2026-11-*/*/*.jsonl',
  hive_partitioning = true
)
GROUP BY event_type, event_name
ORDER BY events DESC;
```

With `hive_partitioning` on, `dt` and `hour` come from the path without parsing
the key, and `event_time` gives the exact timestamp. The prefix in the query
matches `S3_PREFIX` in `wrangler.toml`; change both together.

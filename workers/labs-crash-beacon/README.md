# Labs crash beacon (Cloudflare Worker)

Anonymous crash ingestion for Labs micro-apps. Client sends via `navigator.sendBeacon` when
`VITE_LABS_CRASH_BEACON_URL` points at this worker's `/v1/crash` endpoint.

## Deploy

1. Create a KV namespace: `wrangler kv namespace create CRASH_KV`
2. Update `wrangler.toml` with the returned id.
3. `wrangler deploy`
4. Set `VITE_LABS_CRASH_BEACON_URL=https://<worker>/v1/crash` in Pages build env.

## Privacy

Payloads strip query strings client-side. Worker stores truncated message, app id, sanitized route, source, timestamp — no PII.

See [`docs/adr/0016-client-crash-telemetry.md`](../../docs/adr/0016-client-crash-telemetry.md).

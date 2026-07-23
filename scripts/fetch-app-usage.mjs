#!/usr/bin/env node
/**
 * Refresh per-app usage from Google Analytics (GA4) into docs/app-quality-tiers.json.
 *
 * Usage feeds the app quality tiers (docs/APP_QUALITY_TIERS.md): how much rigor a
 * change to an app deserves. This script only updates the `usage` numbers and a
 * `suggestedTier`; it NEVER overwrites the human-set `tier`/`criticality`, so a
 * quiet week cannot auto-demote a critical app. A human confirms tier changes.
 *
 * Auth (pick one):
 *   GA4_ACCESS_TOKEN   an OAuth access token with analytics.readonly scope
 *                      (quickest: gcloud auth print-access-token, or the OAuth
 *                      Playground). No extra npm deps needed.
 *   GOOGLE_APPLICATION_CREDENTIALS  path to a service-account JSON key that has
 *                      Viewer on the GA4 property. Requires `google-auth-library`
 *                      (npm i -D google-auth-library); the script loads it lazily.
 *
 * Required:
 *   GA4_PROPERTY_ID    the GA4 property id, numeric or "properties/123456789".
 * Optional:
 *   GA4_WINDOW_DAYS    lookback window (default 90).
 *
 * Example:
 *   GA4_PROPERTY_ID=123456789 GA4_ACCESS_TOKEN=$(gcloud auth print-access-token) \
 *     node scripts/fetch-app-usage.mjs
 *
 * Then review and commit the updated docs/app-quality-tiers.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tiersPath = path.join(root, 'docs', 'app-quality-tiers.json');
const manifestPath = path.join(root, 'src', 'labsHome', 'labsCatalog.manifest.json');

const propertyRaw = process.env.GA4_PROPERTY_ID;
if (!propertyRaw) {
  console.error('fetch-app-usage: set GA4_PROPERTY_ID (and GA4_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS). See the script header.');
  process.exit(1);
}
const property = propertyRaw.startsWith('properties/') ? propertyRaw : `properties/${propertyRaw}`;
const windowDays = Number.isFinite(Number(process.env.GA4_WINDOW_DAYS)) ? Number(process.env.GA4_WINDOW_DAYS) : 90;

async function getAccessToken() {
  if (process.env.GA4_ACCESS_TOKEN) return process.env.GA4_ACCESS_TOKEN;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    let GoogleAuth;
    try {
      ({ GoogleAuth } = await import('google-auth-library'));
    } catch {
      console.error('fetch-app-usage: GOOGLE_APPLICATION_CREDENTIALS is set but google-auth-library is missing. Run: npm i -D google-auth-library (or use GA4_ACCESS_TOKEN).');
      process.exit(1);
    }
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (!token) {
      console.error('fetch-app-usage: service-account auth returned no token. Check GOOGLE_APPLICATION_CREDENTIALS and the property grant.');
      process.exit(1);
    }
    return token;
  }
  console.error('fetch-app-usage: no credentials. Set GA4_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

// Map a GA pagePath (e.g. "/drums/", "/encore/song/123") to an app key. App keys
// come from the catalog manifest paths ("/drums/" -> "drums").
function appKeysFromManifest() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const apps = Array.isArray(manifest) ? manifest : manifest.apps || Object.values(manifest).find(Array.isArray);
  return apps.map((a) => a.path.replace(/\//g, '')).filter(Boolean);
}

function keyForPath(pagePath, keys) {
  const seg = (pagePath || '').split('/').filter(Boolean)[0];
  return keys.includes(seg) ? seg : null;
}

// Thresholds are deliberately coarse and advisory — they SUGGEST a tier, a human sets it.
// Keyed on `sessions` (additive across pages — safe to sum) rather than `activeUsers`
// (de-duplicated per row, so summing across an app's pages inflates it).
function suggestTier(sessions) {
  if (sessions >= 30) return 'protected';
  if (sessions >= 5) return 'standard';
  return 'experimental';
}

async function runReport(token) {
  const url = `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`;
  const body = {
    dateRanges: [{ startDate: `${windowDays}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'userEngagementDuration' }],
    // 10k rows is ample for a personal portfolio (one request, no paging). If a
    // property ever exceeds it, add offset-based pagination on `rows`.
    limit: 10000,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`fetch-app-usage: GA4 API ${res.status} ${res.statusText}\n${await res.text()}`);
    process.exit(1);
  }
  return res.json();
}

const token = await getAccessToken();
const report = await runReport(token);
const keys = appKeysFromManifest();

const agg = {};
for (const row of report.rows || []) {
  const pagePath = row.dimensionValues?.[0]?.value;
  const key = keyForPath(pagePath, keys);
  if (!key) continue;
  const [activeUsers, sessions, engagement] = (row.metricValues || []).map((m) => Number(m.value) || 0);
  const a = (agg[key] ||= { activeUsers: 0, sessions: 0, engagementSeconds: 0 });
  a.activeUsers += activeUsers;
  a.sessions += sessions;
  a.engagementSeconds += engagement;
}

if (!existsSync(tiersPath)) {
  console.error(`fetch-app-usage: ${tiersPath} not found — create it first (see docs/APP_QUALITY_TIERS.md).`);
  process.exit(1);
}
const tiers = JSON.parse(readFileSync(tiersPath, 'utf8'));
tiers.usageWindowDays = windowDays;
tiers.usageUpdated = new Date().toISOString().slice(0, 10);

for (const key of Object.keys(tiers.apps || {})) {
  const app = tiers.apps[key];
  const a = agg[key] || { activeUsers: 0, sessions: 0, engagementSeconds: 0 };
  tiers.apps[key].usage = {
    // activeUsers is approximate — GA4 de-duplicates it per page row, so this
    // sum over an app's pages can overcount. Use `sessions` for decisions.
    activeUsersApprox: a.activeUsers,
    sessions: a.sessions,
    engagementMinutes: Math.round(a.engagementSeconds / 60),
  };
  // Suggest from sessions, not the human tier. Private / high-criticality apps
  // (e.g. login-gated Encore) legitimately show little GA traffic, so never let a
  // quiet week suggest demoting them — that is the whole point of tier != stage.
  const shielded = app.private === true || app.criticality === 'high';
  tiers.apps[key].suggestedTier = shielded ? app.tier : suggestTier(a.sessions);
}

writeFileSync(tiersPath, JSON.stringify(tiers, null, 2) + '\n');
const changed = Object.entries(tiers.apps).filter(([, v]) => v.suggestedTier && v.suggestedTier !== v.tier);
console.log(`fetch-app-usage: updated ${tiersPath} (window ${windowDays}d).`);
if (changed.length) {
  console.log('Tier suggestions differ from current — review and reconcile by hand:');
  for (const [k, v] of changed) console.log(`  ${k}: tier=${v.tier} suggested=${v.suggestedTier} (sessions=${v.usage.sessions})`);
} else {
  console.log('No tier suggestions differ from current settings (private/high-criticality apps are shielded).');
}

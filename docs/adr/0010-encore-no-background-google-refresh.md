# ADR 0010: Encore never silently refreshes Google sign-in in the background

## Status

Accepted.

## Context

Users running Encore for hours at a time reported a steady accumulation of "ghost popup
windows" — small Google sign-in windows that appeared and got stuck, sometimes a half-dozen at
once after a long session. The complaint was that the spam felt buggy and was a completely
untenable UX, even if the alternative was being asked to sign in more often.

An earlier mitigation in [`EncoreAuthContext`](../../src/encore/context/EncoreAuthContext.tsx)
conditionally **skipped** the silent prefetch inside `signInWithGoogle` when a recent silent
failure was recorded. That helped only the user-click path; the underlying problem was that the
context had **four** independent code paths that fired
`requestGoogleAccessToken({ prompt: 'none' })` on a schedule the user couldn't see or control:

1. **Bootstrap** silent restore (up to three sequential `prompt: 'none'` calls on every page
   load when a persisted session was present).
2. **Refresh timer** that armed roughly five minutes before the persisted token's expiry, with a
   5/15/60-minute exponential backoff in expired mode.
3. **`visibilitychange`** listener that re-probed when the tab regained focus and the in-memory
   token was missing (throttled to once per eight minutes).
4. The pre-existing silent prefetch inside `signInWithGoogle` itself.

`prompt: 'none'` is _meant_ to be popup-less — it loads a hidden iframe under
`accounts.google.com/gsi/transform`. In practice, when the browser blocks third-party cookies or
the GIS iframe falls into an inconsistent state, that iframe can surface as a stuck small popup
that the user can't dismiss, and the GIS client occasionally fails over to opening a real
popup. Each of the four code paths above multiplied the surface area for that failure.

The user explicitly chose the nuclear trade-off: lose silent refresh entirely; require a click
after every expiry; in exchange the popup spam stops.

## Decision

**Encore never calls Google Identity Services from the background.** A Google popup or iframe
opens only when the user clicks Sign in. There is no silent prefetch, no scheduled silent
refresh, no focus-driven probe, and no expired-mode retry loop.

The auth-context lifecycle now looks like this:

```mermaid
flowchart TD
  bootstrap[Bootstrap useEffect]
  bootstrap -->|fresh persisted session| useToken[Seed in-memory token from storage]
  bootstrap -->|stale or absent session + identity| expired[enterSessionExpiredMode]
  bootstrap -->|nothing| signedOut[Sign-in landing]
  useToken --> tick[Local expiry-tick useEffect]
  tick -->|"setTimeout at expiresAtMs - 60s"| expired
  expired --> accountMenuCTA[EncoreAccountMenu shows<br/>'Sign in to sync']
  accountMenuCTA --> click[User click]
  signedOut --> click
  click --> popup[Exactly ONE GIS popup]
  popup --> useToken
  siblingTab[storage event from sibling tab] --> useToken
```

Key changes inside [`src/encore/context/EncoreAuthContext.tsx`](../../src/encore/context/EncoreAuthContext.tsx):

1. **Bootstrap effect** became synchronous and never calls GIS. It reads the persisted session
   and either seeds the in-memory token, enters expired mode, or leaves the user signed out —
   then sets `googleAuthReady = true`.
2. **Local expiry-tick effect** schedules a `setTimeout` at `expiresAtMs - 60_000`. When it
   fires, it flips the auth context into expired mode (no GIS calls). The 60-second cushion just
   gives the UI a beat to show "Sign in to sync" before the next Drive call would have failed.
3. **Cross-tab `storage` event** is the one popup-free concession to multi-tab UX. When tab A
   finishes interactive sign-in, the persisted session lands in `localStorage`; tab B's native
   `storage` event fires (it never fires on the writer tab) and tab B adopts the fresh token
   without showing its own popup. A sibling-tab sign-out is also mirrored.
4. **`signInWithGoogle`** is a straight-line interactive call gated by `googleSignInInFlightRef`
   to absorb rapid double-clicks. No silent prefetch. No retry on failure — the user sees the
   error and clicks again when ready.
5. **Deleted entirely**: `requestGoogleSilentToken`, `markSilentRefreshFailed`,
   `lastSilentRefreshFailureAtRef`, `lastVisibilitySilentProbeAtRef`, the `armTimer` refresh
   loop, the `visibilitychange` listener, and the 5/15/60-minute expired-mode backoff.

The existing `EncoreAccountMenu` already surfaces expired-mode with a "Sign in to sync" warning
chip and a full `IntegrationCard` with a "Sign in again" CTA, so no new banner is needed.

## Consequences

- **Returning users** see the Sign in landing on each visit if their persisted token has expired
  (typically one hour after their last interactive sign-in). One click resumes the session. The
  trade-off was explicit per the user complaint.
- **In-session expiry** is handled by the existing account-menu chip + IntegrationCard pair.
  Drive writes that race past expiry will fail with the existing sync-error surface; the user
  signs in again from the menu and resumes.
- **Multi-tab** sign-in propagates via the `storage` event so the user doesn't need to click in
  every tab. Safari occasionally throttles cross-tab `storage` events; in that worst case the
  user clicks Sign in in the laggy tab.
- **Cross-app cohabitation**: Stanza / Scales / other Labs apps still drive their own Google
  silent paths via the shared `useLabsEncoreGoogleSession` / `ensureLabsGoogleAccessTokenForDrive`
  hooks. Those are out of scope here — if popup spam reappears specifically because Encore is
  open alongside another Labs tab, the same nuclear treatment can be applied there.
- **No Drive 401 → GIS** loop: Encore's Drive layer already does not call GIS on 401 (it surfaces
  the failure via sync state). The expired-mode UI is the user's signal to act.
- The shared `googleTokenClient` cache + serialization in
  [`src/shared/google/googleTokenClient.ts`](../../src/shared/google/googleTokenClient.ts) is
  unchanged. It still prevents iframe accumulation when popups do happen (the one
  user-initiated path).

## Alternatives considered

- **Keep one-shot bootstrap silent restore**: would let returning users with a fresh Google
  cookie auto-resume without a click. Rejected per the user's explicit nuclear preference — the
  bootstrap path was one of the four documented sources of ghost popups.
- **Show a "session expires in 5 min" banner with a click-to-refresh affordance**: less
  abrupt, but adds a UI element and doesn't materially change the trade-off. Rejected; the
  existing account-menu chip is sufficient.
- **Background refresh with stricter cookie / iframe handling**: would require deep changes to
  GIS-handling code that would still leave the door open to ghost popups on browsers we don't
  control. Rejected as not worth the maintenance burden.

## Links

- [`src/encore/context/EncoreAuthContext.tsx`](../../src/encore/context/EncoreAuthContext.tsx) — the refactor lives here.
- [`src/encore/components/EncoreAccountMenu.tsx`](../../src/encore/components/EncoreAccountMenu.tsx) — expired-mode chip + IntegrationCard CTA.
- [`src/shared/google/encoreGoogleTokenStorage.ts`](../../src/shared/google/encoreGoogleTokenStorage.ts) — persisted session + `ENCORE_GOOGLE_SESSION_STORAGE_KEY` (used by the cross-tab `storage` listener).
- [`src/shared/google/googleTokenClient.ts`](../../src/shared/google/googleTokenClient.ts) — token-client cache (kept; only invoked from the one user-initiated sign-in path now).
- [`src/encore/context/EncoreAuthContext.noBackgroundRefresh.test.tsx`](../../src/encore/context/EncoreAuthContext.noBackgroundRefresh.test.tsx) — tests that pin the nuclear behavior.

# shared/google — OAuth session + Drive account chrome

One Google session shared by every Labs app (Encore token storage is the canonical store — do not fork per app).

## Map

| Area                       | Files                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token/session              | `labsGoogleDriveAccess.ts` (`ensureLabsGoogleAccessTokenForDrive`), `encoreGoogleTokenStorage.ts`, `googleTokenClient.ts`, `useLabsEncoreGoogleSession.ts` |
| Session consumers registry | `labsGoogleSessionConsumers.ts` — call `touchLabsGoogleSessionConsumer('<app>')` on app boot                                                               |
| Account chrome             | `LabsDriveAccountMenu.tsx` (preferred), `LabsAccountMenu.tsx`, `LabsGoogleSignInButton.tsx`                                                                |
| Backup/conflict UI         | `LabsDriveConflictDialog.tsx`, `LabsDriveRestoreDialog.tsx`, `LabsPortfolioConflictReviewDialog.tsx`, `LabsDriveSyncToast.tsx`                             |
| Tester gating              | `labsDriveTesterGate.ts`                                                                                                                                   |

## Contracts

- **No background token refresh** — interactive prompts only (`labsGoogleNoBackgroundRefresh.test.tsx` enforces).
- **Scopes are shared** across Encore/Stanza/Scales/Gesture — never narrow scopes in app-local code.
- New Drive-backed apps mount `LabsDriveAccountMenu` rather than building sign-in chrome; conventions in [`SHARED_UI_CONVENTIONS.md`](../SHARED_UI_CONVENTIONS.md) § Drive.
- OAuth redirect / BFF decisions: see `docs/adr/` OAuth rows.

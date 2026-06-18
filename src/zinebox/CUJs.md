# Critical user journeys — Zine Box

Durable workflows for manual checks, agent verification, and performance benchmarks.  
UX sketch skill: [`labs-ux-journey`](../../.cursor/skills/labs-ux-journey/SKILL.md). Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Browse library and upload PDFs

**Primary goal:** Add PDF zines to the local library and open the reader.  
**Persona:** Reader with a folder of indie PDFs on disk.

### Steps

1. Open `/zinebox/` → library chrome (`?e2eSeed=1` in dev/e2e).
2. Click **Upload zines** → add PDFs via drop zone or file picker.
3. Open a zine from the grid or **Open a random unread zine**.

### Success criteria

- Library header and upload entry points visible before navigation actions.
- Reader opens at `#/read/<id>` without blank spread.

### Automation

| Type   | Artifact                            |
| ------ | ----------------------------------- |
| Smoke  | `e2e/smoke/zinebox-library.spec.ts` |
| Helper | `e2e/helpers/zineboxLibrary.ts`     |

---

## CUJ-002: Import PDFs from Google Drive folder

**Primary goal:** Bulk-import a Drive folder tree with review, tags, and blocking progress.  
**Persona:** User with zines already organized in Drive (e.g. Shortbox export).

### Steps

1. Sign in (account menu or Review import flow).
2. Paste folder URL → **Review import** → confirm PDF count.
3. Set source/tags → **Import N PDFs** → wait for blocking job to finish.

### Success criteria

- Review dialog shows scan results before download starts.
- Progress bar visible during import; success notice lists added count.

### Automation

| Type       | Artifact                                 |
| ---------- | ---------------------------------------- |
| Smoke      | `e2e/smoke/zinebox-drive-import.spec.ts` |
| Stubs      | `e2e/helpers/zineboxDriveImport.ts`      |
| Guardrails | `labsBlockingJobGuardrails.test.ts`      |

---

## CUJ-003: Drive library backup

**Primary goal:** Sync library JSON + PDF sidecars to Drive (`silent_union`).  
**Persona:** Multi-device reader keeping library aligned.

### Steps

1. Sign in via account menu.
2. Manual backup or auto-sync after local edit.
3. Tombstoned deletes propagate on merge (see `zineboxDriveTombstones.ts`).

### Success criteria

- PDF sidecars upload/download during backup pull.
- Undo last sync available after pull.

### Automation

| Type    | Artifact                                                 |
| ------- | -------------------------------------------------------- |
| Unit    | `src/zinebox/drive/zineboxDriveMerge.test.ts`            |
| Factory | `src/zinebox/drive/zineboxPortfolioDriveBackupConfig.ts` |

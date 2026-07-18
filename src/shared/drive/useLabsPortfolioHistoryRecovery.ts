import { useCallback, useRef, useState } from 'react';
import type { LabsDriveHistoryRecoveryUiProps } from '../google/labsDriveBackupUiTypes';
import { ensureLabsDrivePortfolioProgressLayout } from './labsDrivePortfolioLayout';
import {
  assessPortfolioHistoryRecovery,
  pickNewestHistoryEntitySlice,
  scanPortfolioProgressRevisions,
  type PortfolioProgressRevisionSnapshot,
} from './labsPortfolioDriveHistoryRecovery';

export type UseLabsPortfolioHistoryRecoveryOptions<TEnvelope, TPayload> = {
  entityNoun: string;
  appFolderName: string;
  ensureAccess: (options: { interactive: boolean }) => Promise<string>;
  parseEnvelope: (json: string) => TEnvelope;
  envelopeToPayload: (envelope: TEnvelope) => TPayload;
  readLocalPayload: () => Promise<TPayload>;
  listEntityIds: (payload: TPayload) => string[];
  getEntityLabel: (id: string, payload: TPayload) => string | undefined;
  /** Return a payload containing only the one entity (for merge), or null if missing. */
  payloadWithEntity: (source: TPayload, id: string) => TPayload | null;
  mergePayload: (local: TPayload, remote: TPayload) => Promise<TPayload> | TPayload;
  onMergePayload: (payload: TPayload) => Promise<void>;
  snapshotBeforeMerge: (trigger: string) => Promise<void>;
  flushDriveWrite: (opts?: { silent?: boolean }) => Promise<void>;
};

/**
 * Drive `progress.json` revision scan + restore for portfolio apps that use a
 * custom backup hook (Stanza, Gesture). Factory apps configure the same via
 * `historyRecovery` on `createLabsPortfolioDriveBackup`.
 */
export function useLabsPortfolioHistoryRecovery<TEnvelope, TPayload>(
  options: UseLabsPortfolioHistoryRecoveryOptions<TEnvelope, TPayload>,
): LabsDriveHistoryRecoveryUiProps {
  const [historyRecoverOpen, setHistoryRecoverOpen] = useState(false);
  const historySnapshotsRef = useRef<PortfolioProgressRevisionSnapshot<TEnvelope>[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const scanHistoryForRecovery = useCallback(async () => {
    const opts = optionsRef.current;
    const token = await opts.ensureAccess({ interactive: true });
    const refs = await ensureLabsDrivePortfolioProgressLayout(token, opts.appFolderName);
    const local = await opts.readLocalPayload();
    const scan = await scanPortfolioProgressRevisions(token, refs.progressFileId, opts.parseEnvelope);
    historySnapshotsRef.current = scan.snapshots;
    const entries = assessPortfolioHistoryRecovery({
      current: local,
      snapshots: scan.snapshots,
      listEntityIds: opts.listEntityIds,
      envelopeToPayload: opts.envelopeToPayload,
      getEntityLabel: opts.getEntityLabel,
    });
    return {
      entries,
      revisionsScanned: scan.revisionsScanned,
      revisionsSkipped: scan.revisionsSkipped,
    };
  }, []);

  const restoreFromHistory = useCallback(async (ids: string[]) => {
    const opts = optionsRef.current;
    if (ids.length === 0) return { restoredCount: 0 };
    await opts.snapshotBeforeMerge('history-recovery');
    let local = await opts.readLocalPayload();
    let restoredCount = 0;
    for (const id of ids) {
      const remoteSlice = pickNewestHistoryEntitySlice({
        id,
        snapshots: historySnapshotsRef.current,
        envelopeToPayload: opts.envelopeToPayload,
        payloadWithEntity: opts.payloadWithEntity,
      });
      if (!remoteSlice) continue;
      const beforeIds = new Set(opts.listEntityIds(local));
      local = await opts.mergePayload(local, remoteSlice);
      const afterIds = new Set(opts.listEntityIds(local));
      if (!beforeIds.has(id) && afterIds.has(id)) restoredCount += 1;
    }
    if (restoredCount > 0) {
      await opts.onMergePayload(local);
      await opts.flushDriveWrite({ silent: true });
    }
    return { restoredCount };
  }, []);

  return {
    entityNoun: options.entityNoun,
    historyRecoverOpen,
    openHistoryRecover: () => setHistoryRecoverOpen(true),
    closeHistoryRecover: () => setHistoryRecoverOpen(false),
    scanHistoryForRecovery,
    restoreFromHistory,
  };
}

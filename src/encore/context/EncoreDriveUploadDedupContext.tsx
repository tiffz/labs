/* Provider + hook share module state; Fast Refresh split not worth the import churn. */
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { driveGetFileContentFingerprint } from '../drive/driveFetch';
import {
  registerFingerprintInEncoreDriveContentIndex,
  type EncoreDriveContentIndexEntry,
} from '../drive/encoreDriveContentIndex';
import {
  runEncoreDriveUploadWithDuplicateCheck,
  type EncoreDriveDuplicateUploadChoice,
} from '../drive/encoreDriveUploadDedup';
import { EncoreDriveDuplicateReuseDialog } from '../components/EncoreDriveDuplicateReuseDialog';
import { useEncoreAuth } from './EncoreAuthContext';
import { useEncoreActions } from './useEncoreActions';
import { useEncoreLibraryExtras } from './EncoreLibraryContext';

type PendingReusePrompt = {
  fileName: string;
  entry: EncoreDriveContentIndexEntry;
  resolve: (choice: EncoreDriveDuplicateUploadChoice) => void;
};

export type EncoreDriveUploadDedupContextValue = {
  uploadWithDuplicateCheck: <T>(opts: {
    file: File;
    uploadNew: () => Promise<T>;
    reuseExisting: (driveFileId: string) => Promise<T>;
  }) => Promise<T | null>;
  registerUploadedDriveFile: (driveFileId: string, label: string) => Promise<void>;
};

const EncoreDriveUploadDedupContext = createContext<EncoreDriveUploadDedupContextValue | null>(null);

export function EncoreDriveUploadDedupProvider({ children }: { children: ReactNode }): ReactElement {
  const { googleAccessToken } = useEncoreAuth();
  const { repertoireExtras } = useEncoreLibraryExtras();
  const { saveRepertoireExtras } = useEncoreActions();
  const [pending, setPending] = useState<PendingReusePrompt | null>(null);
  const contentIndexRef = useRef(repertoireExtras.driveContentIndex);
  contentIndexRef.current = repertoireExtras.driveContentIndex;

  const promptReuse = useCallback(
    (entry: EncoreDriveContentIndexEntry, fileName: string) =>
      new Promise<EncoreDriveDuplicateUploadChoice>((resolve) => {
        setPending({ entry, fileName, resolve });
      }),
    [],
  );

  const uploadWithDuplicateCheck = useCallback<EncoreDriveUploadDedupContextValue['uploadWithDuplicateCheck']>(
    async ({ file, uploadNew, reuseExisting }) =>
      runEncoreDriveUploadWithDuplicateCheck({
        file,
        contentIndex: contentIndexRef.current,
        promptReuse: (entry) => promptReuse(entry, file.name),
        uploadNew,
        reuseExisting,
      }),
    [promptReuse],
  );

  const registerUploadedDriveFile = useCallback(
    async (driveFileId: string, label: string) => {
      if (!googleAccessToken) return;
      try {
        const fp = await driveGetFileContentFingerprint(googleAccessToken, driveFileId);
        const next = registerFingerprintInEncoreDriveContentIndex(
          contentIndexRef.current ?? {},
          fp,
          label,
        );
        await saveRepertoireExtras({ driveContentIndex: next });
      } catch {
        /* index enrichment is best-effort */
      }
    },
    [googleAccessToken, saveRepertoireExtras],
  );

  const closePending = useCallback((choice: EncoreDriveDuplicateUploadChoice) => {
    setPending((cur) => {
      cur?.resolve(choice);
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({ uploadWithDuplicateCheck, registerUploadedDriveFile }),
    [uploadWithDuplicateCheck, registerUploadedDriveFile],
  );

  return (
    <EncoreDriveUploadDedupContext.Provider value={value}>
      {children}
      <EncoreDriveDuplicateReuseDialog
        open={pending != null}
        fileName={pending?.fileName ?? ''}
        entry={pending?.entry ?? null}
        onReuse={() => closePending('reuse')}
        onUploadAnyway={() => closePending('upload')}
        onCancel={() => closePending('cancel')}
      />
    </EncoreDriveUploadDedupContext.Provider>
  );
}

export function useEncoreDriveUploadDedup(): EncoreDriveUploadDedupContextValue {
  const ctx = useContext(EncoreDriveUploadDedupContext);
  if (!ctx) {
    throw new Error('useEncoreDriveUploadDedup must be used within EncoreDriveUploadDedupProvider');
  }
  return ctx;
}

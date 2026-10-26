import { useEffect, type ReactElement } from 'react';
import type { EncoreDriveUploadFolderOverrides, EncoreSong } from '../../types';
import { useEncoreSongDraftUndo } from '../../hooks/useEncoreSongDraftUndo';
import type { ResourceGroupsFileDropConfig } from '../song/practiceResourceGroups';
import { PracticeResourcesPanel } from '../song/PracticeResourcesPanel';
import { PracticeResourcesPanelWithDnD } from '../song/PracticeResourcesPanelWithDnD';
import type { SongMediaUploadSlot } from '../song/songMediaUploadSlot';
import { useSongPageMediaHub } from '../song/useSongPageMediaHub';

export type PracticeSongMediaResourcesProps = {
  draft: EncoreSong;
  setDraft: React.Dispatch<React.SetStateAction<EncoreSong | null>>;
  songs: EncoreSong[];
  googleAccessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  spotifyLinked: boolean;
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides | null;
  persistAfterMetadataRefresh: (song: EncoreSong) => Promise<void>;
  fileDrop?: ResourceGroupsFileDropConfig<SongMediaUploadSlot>;
  onUploadReady?: (stage: (slot: SongMediaUploadSlot, files: File[]) => void) => void;
};

/** Lazy media hub — only mounts while Practice tab is active so hidden tabs skip hub hooks. */
export function PracticeSongMediaResources({
  fileDrop,
  onUploadReady,
  ...hubProps
}: PracticeSongMediaResourcesProps): ReactElement {
  const { applySongDraftChange } = useEncoreSongDraftUndo({
    draft: hubProps.draft,
    setDraft: hubProps.setDraft,
    persist: hubProps.persistAfterMetadataRefresh,
  });
  const mediaHub = useSongPageMediaHub({
    ...hubProps,
    isNew: false,
    routeKind: 'song',
    routeSongId: hubProps.draft.id,
    hubActive: true,
    applySongDraftChange,
  });
  useEffect(() => {
    onUploadReady?.(mediaHub.stageFilesToMediaSlot);
  }, [mediaHub.stageFilesToMediaSlot, onUploadReady]);
  if (mediaHub.practiceResourceDnD) {
    return (
      <>
        <PracticeResourcesPanelWithDnD
          groups={mediaHub.resourceGroups}
          fileDrop={fileDrop}
          practiceResourceDnD={mediaHub.practiceResourceDnD}
        />
        {mediaHub.stagedUploadPanel}
      </>
    );
  }
  return (
    <>
      <PracticeResourcesPanel groups={mediaHub.resourceGroups} fileDrop={fileDrop} />
      {mediaHub.stagedUploadPanel}
    </>
  );
}

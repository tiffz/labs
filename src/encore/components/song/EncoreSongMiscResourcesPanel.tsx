import type { ReactElement } from 'react';
import { EncoreResourceLinksPanel } from '../EncoreResourceLinksPanel';
import type { EncoreMiscResource } from '../../types';

const MISC_FILE_ACCEPT =
  'audio/*,video/*,image/*,.pdf,.txt,.md,.doc,.docx,application/pdf,text/*,.mp3,.m4a,.wav,.webm,.aac,.flac,.ogg';

export type EncoreSongMiscResourcesPanelProps = {
  resources: EncoreMiscResource[];
  onChange: (resources: EncoreMiscResource[]) => void;
  onAddLink: (url: string, label: string) => void;
  onUploadFiles: (files: File[]) => void | Promise<void>;
  driveUploading?: boolean;
  canUploadToDrive?: boolean;
};

export function EncoreSongMiscResourcesPanel({
  resources,
  onChange,
  onAddLink,
  onUploadFiles,
  driveUploading = false,
  canUploadToDrive = true,
}: EncoreSongMiscResourcesPanelProps): ReactElement {
  return (
    <EncoreResourceLinksPanel
      layout="practice-list"
      className="encore-song-misc-resources"
      resources={resources}
      onChange={onChange}
      onAddLink={onAddLink}
      onUploadFiles={onUploadFiles}
      emptyHint="None yet."
      addButtonLabel="Add resource"
      fileAccept={MISC_FILE_ACCEPT}
      driveUploading={driveUploading}
      canUploadToDrive={canUploadToDrive}
    />
  );
}

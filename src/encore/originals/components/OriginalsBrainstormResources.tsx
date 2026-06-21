import { useRef, type ReactElement } from 'react';
import { EncoreResourceLinksPanel } from '../../components/EncoreResourceLinksPanel';
import {
  addResourceFromUrl,
  createResourceFromLocalFile,
} from '../../repertoire/encoreResourceLinks';
import { scheduleEncoreResourceLabelEnrichment } from '../../repertoire/encoreResourceLinkMeta';
import type { EncoreMiscResource } from '../../types';

const BRAINSTORM_FILE_ACCEPT = '.pdf,.txt,.md,.doc,.docx,application/pdf,text/*';

export type OriginalsBrainstormResourcesProps = {
  resources: EncoreMiscResource[];
  onChange: (resources: EncoreMiscResource[]) => void;
  variant?: 'default' | 'sidebar';
};

export function OriginalsBrainstormResources({
  resources,
  onChange,
  variant = 'default',
}: OriginalsBrainstormResourcesProps): ReactElement {
  const isSidebar = variant === 'sidebar';
  const resourcesRef = useRef(resources);
  resourcesRef.current = resources;

  const onAddLink = (url: string, label: string) => {
    const added = addResourceFromUrl(resourcesRef.current, url, label || undefined);
    if (!added) return;
    onChange(added.next);
    if (!label.trim()) {
      scheduleEncoreResourceLabelEnrichment(
        url,
        added.added.id,
        () => resourcesRef.current,
        onChange,
      );
    }
  };

  const onUploadFiles = (files: File[]) => {
    if (files.length === 0) return;
    onChange([...resourcesRef.current, ...files.map(createResourceFromLocalFile)]);
  };

  return (
    <EncoreResourceLinksPanel
      className={[
        'encore-originals-brainstorm-resources',
        isSidebar ? 'encore-originals-brainstorm-resources--sidebar' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      layout={isSidebar ? 'sidebar' : 'stack'}
      title={isSidebar ? 'References' : 'Reference resources'}
      resources={resources}
      onChange={onChange}
      onAddLink={onAddLink}
      onUploadFiles={onUploadFiles}
      emptyHint="Links and files you use while writing."
      addButtonLabel="Add reference"
      fileAccept={BRAINSTORM_FILE_ACCEPT}
      fillHeight={isSidebar}
      canUploadToDrive={false}
    />
  );
}

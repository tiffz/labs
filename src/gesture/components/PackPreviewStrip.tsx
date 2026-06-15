import { memo } from 'react';
import { useNearViewport } from '../hooks/useNearViewport';
import { usePackPreviewUrls } from '../hooks/usePackPreviewUrls';
import PackPreviewCell from './PackPreviewCell';

type PackPreviewStripProps = {
  driveFileIds: string[];
  limit?: number;
  className?: string;
  /** When false, only show cache hits (skip network). */
  previewFetchEnabled?: boolean;
};

function PackPreviewStrip({
  driveFileIds,
  limit = 4,
  className,
  previewFetchEnabled = true,
}: PackPreviewStripProps): React.ReactElement {
  const { ref, near } = useNearViewport('400px');
  const { urls, loading } = usePackPreviewUrls(driveFileIds, limit, previewFetchEnabled);
  const previewIds = driveFileIds.slice(0, limit);
  const slots = previewIds.length > 0 ? previewIds.length : limit;

  return (
    <div
      ref={ref}
      className={`gesture-preview-strip${className ? ` ${className}` : ''}`}
      aria-hidden={previewIds.length === 0}
    >
      {Array.from({ length: slots }, (_, index) => (
        <PackPreviewCell
          key={previewIds[index] ?? `empty-${index}`}
          url={urls[index] || undefined}
          loading={!urls[index] && near && loading}
          priority="high"
        />
      ))}
    </div>
  );
}

function arePackPreviewStripPropsEqual(
  a: PackPreviewStripProps,
  b: PackPreviewStripProps,
): boolean {
  if (a.limit !== b.limit || a.className !== b.className) return false;
  if (a.previewFetchEnabled !== b.previewFetchEnabled) return false;
  const limitA = a.limit ?? 4;
  const limitB = b.limit ?? 4;
  return a.driveFileIds.slice(0, limitA).join(',') === b.driveFileIds.slice(0, limitB).join(',');
}

export default memo(PackPreviewStrip, arePackPreviewStripPropsEqual);

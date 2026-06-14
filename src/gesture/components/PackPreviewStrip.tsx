import { useNearViewport } from '../hooks/useNearViewport';
import { usePackPreviewUrls } from '../hooks/usePackPreviewUrls';
import PackPreviewCell from './PackPreviewCell';

type PackPreviewStripProps = {
  driveFileIds: string[];
  limit?: number;
  className?: string;
};

export default function PackPreviewStrip({
  driveFileIds,
  limit = 4,
  className,
}: PackPreviewStripProps): React.ReactElement {
  const { ref, near } = useNearViewport('400px');
  const { urls, loading } = usePackPreviewUrls(driveFileIds, limit, near);
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

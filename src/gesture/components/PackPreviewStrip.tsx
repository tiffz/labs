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
  const { urls, loading } = usePackPreviewUrls(driveFileIds, limit);
  const previewIds = driveFileIds.slice(0, limit);
  const slots = previewIds.length > 0 ? previewIds.length : limit;

  return (
    <div className={`gesture-preview-strip${className ? ` ${className}` : ''}`} aria-hidden={previewIds.length === 0}>
      {Array.from({ length: slots }, (_, index) => (
        <PackPreviewCell
          key={previewIds[index] ?? `empty-${index}`}
          url={urls[index] || undefined}
          loading={loading && !urls[index]}
          priority={index === 0 ? 'high' : 'auto'}
        />
      ))}
    </div>
  );
}

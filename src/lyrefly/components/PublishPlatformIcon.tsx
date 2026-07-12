import type { ReactElement } from 'react';

import { publishPlatformIcon } from '../utils/publishPlatformVisual';

export type PublishPlatformIconProps = {
  platform: string;
  fontSize?: 'inherit' | 'small' | 'medium';
};

export function PublishPlatformIcon({ platform, fontSize = 'small' }: PublishPlatformIconProps): ReactElement {
  const Icon = publishPlatformIcon(platform);
  return <Icon fontSize={fontSize} aria-hidden />;
}

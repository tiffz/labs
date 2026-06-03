import type { ReactElement } from 'react';

export type SessionScreenIconProps = {
  name: string;
  size?: number;
};

export function SessionScreenIcon({ name, size = 20 }: SessionScreenIconProps): ReactElement {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {name}
    </span>
  );
}

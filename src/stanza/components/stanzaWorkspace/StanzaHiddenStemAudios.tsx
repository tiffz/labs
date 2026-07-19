import { Fragment } from 'react';
import type { MutableRefObject } from 'react';
import type { StanzaStemTrack } from '../../db/stanzaDb';

type StanzaHiddenStemAudiosProps = {
  stems: StanzaStemTrack[];
  stemUrlById: Record<string, string>;
  stemAudioRefs: MutableRefObject<Map<string, HTMLAudioElement>>;
};

/** Hidden `<audio>` elements for stem mix layers; registered into the container's ref map. */
export default function StanzaHiddenStemAudios({ stems, stemUrlById, stemAudioRefs }: StanzaHiddenStemAudiosProps) {
  return (
    <>
      {stems.map((stem) => {
        const src = stemUrlById[stem.id];
        if (!src) return null;
        return (
          <Fragment key={stem.id}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided stem; no captions */}
            <audio
              ref={(el) => {
                const m = stemAudioRefs.current;
                if (el) m.set(stem.id, el);
                else m.delete(stem.id);
              }}
              src={src}
              preload="auto"
              aria-hidden
              style={{ display: 'none' }}
            />
          </Fragment>
        );
      })}
    </>
  );
}

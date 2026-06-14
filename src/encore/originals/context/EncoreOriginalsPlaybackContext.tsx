/* Re-export barrel for Originals playback; Fast Refresh split not worth the import churn. */
/* eslint-disable react-refresh/only-export-components */
export {
  useEncoreMediaPlayback,
  useEncoreOriginalsPlayback,
  type EncoreMediaPlaybackContextValue,
  type OriginalsPlaybackTarget,
} from '../../context/encoreMediaPlaybackContextStore';
export {
  EncoreMediaPlaybackProvider,
  EncoreMediaPlaybackProvider as EncoreOriginalsPlaybackProvider,
  type EncoreMediaPlaybackTarget,
  type EncoreMediaPlaybackPhase,
  type EncoreMediaPlaybackKind,
  type OriginalsPlaybackPhase,
} from '../../context/EncoreMediaPlaybackContext';

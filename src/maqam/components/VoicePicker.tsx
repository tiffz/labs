import { useState } from 'react';
import Button from '@mui/material/Button';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import { MAQAM_VOICES, findMaqamVoice } from '../audio/maqamVoices';

interface VoicePickerProps {
  voiceId: string;
  onChange: (id: string) => void;
}

/**
 * Which instrument Play uses, and what it actually is.
 *
 * It sits beside Play because that is the control it modifies, and it answers
 * a question the app never answered: what IS this sound. The honest answer is
 * worth having on screen — nothing here is sampled, every note is synthesised
 * at its exact frequency, and that is the reason a quarter tone comes out as
 * an interval rather than as an out-of-tune semitone.
 */
export default function VoicePicker({ voiceId, onChange }: VoicePickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const voice = findMaqamVoice(voiceId) ?? MAQAM_VOICES[0];

  return (
    <>
      <Button
        variant="text"
        size="small"
        className="maqam-voice__trigger"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
      >
        {voice.label}
      </Button>

      <AnchoredPopover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        placement="top-start"
      >
        {/* `maqam-portal` carries the app's tokens into the portal, which
            renders at the end of <body>, outside `.maqam`. */}
        <div className="maqam-portal maqam-voice">
          <ul className="maqam-voice__list">
            {MAQAM_VOICES.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="maqam-voice__option"
                  aria-pressed={option.id === voice.id}
                  onClick={() => {
                    onChange(option.id);
                    setAnchor(null);
                  }}
                >
                  <span className="maqam-voice__label">{option.label}</span>
                  <span className="maqam-voice__description">{option.description}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="maqam-voice__note">
            All three are one string model, synthesised in the browser rather than sampled. That is
            what lets a quarter tone sound at its own frequency instead of a piano note dragged
            towards it.
          </p>
        </div>
      </AnchoredPopover>
    </>
  );
}

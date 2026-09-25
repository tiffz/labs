import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

interface HowMaqamsWorkProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The explainer.
 *
 * It exists because the app's own display invites a reasonable wrong
 * conclusion: 7 notes on a staff looks like a Western scale with two odd
 * accidentals. The sections below are the things that are actually different,
 * in the order they stop being confusing.
 *
 * MUI `Dialog` rather than a hand-rolled overlay — it brings the focus trap,
 * Escape handling, scroll lock and backdrop a modal needs, all of which were
 * previously hand-written here and only half complete.
 */
export default function HowMaqamsWork({ open, onClose }: HowMaqamsWorkProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="maqam-help-title"
      /* The dialog renders in a portal at the end of `<body>`, so it needs the
         app's tokens carried to it or every `var(--m3-*)` below resolves to
         nothing. */
      className="maqam-portal"
    >
      <DialogTitle id="maqam-help-title">How maqamat work</DialogTitle>

      <DialogContent dividers className="maqam-help__body">
        <section>
          <h3>7 notes is right. The sizes are what differ.</h3>
          <p>
            A maqam has 7 notes per octave, like a Western scale. The Arabic system makes 24
            quarter-tones per octave available; any one maqam picks 7 of them. So the difference is
            not how many notes there are, it is how far apart they sit.
          </p>
          <p className="maqam-help__compare">
            <span>
              Major third <strong>400¢</strong>
            </span>
            <span className="is-lit">
              Rast&rsquo;s third <strong>350¢</strong>
            </span>
            <span>
              Minor third <strong>300¢</strong>
            </span>
          </p>
          <p>
            That middle value has no Western name. It is not an out-of-tune major third, it is its
            own interval.
          </p>
        </section>

        <section>
          <h3>A maqam is 2 cells, not a run of notes.</h3>
          <p>
            Each is built from 2 <em>ajnas</em> (singular <em>jins</em>): small cells of 3, 4, or 5
            notes, joined at a shared degree. Melodies move cell to cell, and a maqam modulates into
            its neighbours by swapping the upper jins. The panel beside the staff shows the cells of
            whichever maqam is loaded and the degree they share.
          </p>
        </section>

        <section>
          <h3>How the keys are mapped here.</h3>
          <p>
            A piano has 12 keys per octave and a maqam may need pitches between them. So each of the
            12 keys is retuned as a whole: a key marked{' '}
            <span className="maqam-help__badge">½♭</span> plays 50 cents below normal, in every
            octave.
          </p>
          <p>
            That buys quarter-tones at a real cost: <strong>one tuning per key</strong>. A maqam
            needing both E and E½♭ at once cannot be played on this board, because they are the same
            key. Every maqam here is written so that never happens.
          </p>
          <p className="maqam-help__caveat">
            Real quarter-tones are not exactly 50 cents. They shift by region, by performer, and by
            where the note sits in the phrase &mdash; Rast&rsquo;s third is often nearer 340 or 360.
            Exactly 50 is what a retuned 12-key board can do, not what a singer does.
          </p>
        </section>

        <section>
          <h3>What this app leaves out.</h3>
          <p>
            A maqam is also a <em>sayr</em>: a path. Where a melody starts, where it rests, which
            degree it leans on, how it descends differently from how it climbs. None of that is a
            scale, and none of it is here. Saba goes further and never closes at the octave &mdash;
            its upper tonic is flattened, which is why its scale stops at 7 notes.
          </p>
        </section>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" disableElevation>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

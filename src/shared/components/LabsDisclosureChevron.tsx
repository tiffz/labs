import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

type LabsDisclosureChevronProps = {
  className?: string;
};

/**
 * Filled disclosure chevron — same glyph as metronome split menus and Load Rhythm.
 * Pointing down when expanded; rotate the wrapper −90° when collapsed.
 */
export default function LabsDisclosureChevron({
  className,
}: LabsDisclosureChevronProps) {
  return (
    <ArrowDropDownIcon
      className={['labs-disclosure-chevron', className].filter(Boolean).join(' ')}
      aria-hidden
    />
  );
}

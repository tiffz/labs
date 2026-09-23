/**
 * The vocabulary a Western-trained musician needs to read the rest of the app.
 * Written as a glossary rather than tooltips so the terms can be skimmed once
 * and then ignored — a tooltip on every occurrence would be noise by the third
 * maqam.
 */
const TERMS: { term: string; plural?: string; definition: string }[] = [
  {
    term: 'Maqam',
    plural: 'maqamat',
    definition:
      'A modal framework: the scale, the melodic pathways through it, and the character that comes with them. Wider than a Western mode.',
  },
  {
    term: 'Jins',
    plural: 'ajnas',
    definition:
      'The 3-, 4-, or 5-note cell a maqam is built from. Most maqamat are 2 ajnas joined at a shared degree.',
  },
  {
    term: 'Half-flat',
    definition:
      'A pitch about 50 cents below the natural, or a quarter-tone. Written with a slashed flat, and the reason a 12-key board has to be retuned.',
  },
  {
    term: 'Sayr',
    definition:
      'The path a melody traditionally takes through a maqam: where it starts, where it rests, where it modulates.',
  },
  {
    term: "Iqa'",
    plural: "iqa'at",
    definition:
      'A cyclic rhythm, spelled out in dumm (low) and takk (high) strokes. Not covered here. This playground is about pitch.',
  },
];

export default function TerminologyList() {
  return (
    <dl className="maqam-terms">
      {TERMS.map(({ term, plural, definition }) => (
        <div key={term} className="maqam-terms__row">
          <dt className="maqam-terms__term">
            {term}
            {plural && <span className="maqam-terms__plural">pl. {plural}</span>}
          </dt>
          <dd className="maqam-terms__definition">{definition}</dd>
        </div>
      ))}
    </dl>
  );
}

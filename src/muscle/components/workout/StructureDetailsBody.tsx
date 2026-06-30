import type { MuscleMemoryNode } from '../../types/node';
import type { AnatomyTerm } from '../../types/anatomyTerm';
import { formatColloquialAliases } from '../../curriculum/formatColloquialAliases';

export function StructureDetailsBody({
  details,
  omitLatin = false,
  displayName,
}: {
  details: MuscleMemoryNode['details'] | AnatomyTerm;
  omitLatin?: boolean;
  displayName?: string;
}): React.ReactElement {
  const definition = 'definition' in details ? details.definition : '';
  const colloquialNames = 'colloquialNames' in details ? details.colloquialNames : undefined;
  const latinName = 'latinName' in details ? details.latinName : undefined;
  const wikipediaUrl = 'wikipediaUrl' in details ? details.wikipediaUrl : undefined;
  const learnMore = 'learnMore' in details ? details.learnMore : undefined;
  const example = 'example' in details ? details.example : undefined;
  const nameForAliases =
    displayName ?? ('label' in details ? details.label : undefined) ?? latinName ?? '';
  const aliases = formatColloquialAliases(nameForAliases, colloquialNames, latinName);

  return (
    <div className="muscle-context-card__body">
      <p>{definition}</p>
      {example ? <p className="muscle-context-card__example">Example: {example}</p> : null}
      {aliases.length > 0 ? (
        <p className="muscle-context-card__aliases">Also called: {aliases.join(', ')}</p>
      ) : null}
      {latinName && !omitLatin ? <p className="muscle-context-card__latin">{latinName}</p> : null}
      {wikipediaUrl ? (
        <p>
          <a
            className="muscle-context-card__wiki-link"
            href={wikipediaUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Wikipedia
          </a>
        </p>
      ) : null}
      {learnMore?.map((link) => (
        <p key={link.url}>
          <a className="muscle-context-card__wiki-link" href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        </p>
      ))}
    </div>
  );
}

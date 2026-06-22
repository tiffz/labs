import { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import { parsePromptTerms } from '../copy/parsePromptTerms';
import SightQuestionHelp from './SightQuestionHelp';
import SightTerm from './SightTerm';

interface SightPromptProps {
  text: string;
  questionHelp?: string | null;
  className?: string;
}

/**
 * Practice prompt with inline glossary terms (dotted underline) and optional question help.
 */
export default function SightPrompt({
  text,
  questionHelp = null,
  className = 'sight-compare-prompt',
}: SightPromptProps): React.ReactElement {
  const parts = useMemo(() => parsePromptTerms(text), [text]);

  return (
    <div className="sight-prompt">
      <Typography variant="subtitle2" component="p" className={className}>
        {parts.map((part, index) =>
          part.type === 'text' ? (
            <span key={index}>{part.value}</span>
          ) : (
            <SightTerm key={index} termId={part.id} label={part.value} />
          ),
        )}
      </Typography>
      {questionHelp ? <SightQuestionHelp text={questionHelp} /> : null}
    </div>
  );
}

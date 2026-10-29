import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import Button from '@mui/material/Button';
import type { ReactElement } from 'react';

import { richTextPlainText } from '../../shared/utils/richTextContent';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import { lyreflyProjectStageHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import type { ComicProject } from '../types';

/**
 * A comic still in brainstorming, shown in the Sketchbook beside loose notes (ADR 0031). It reads
 * and acts like a note: open it to keep brainstorming, or start developing it onto the Workbench.
 */
export function LyreflyIdeaWorkCard({ project }: { project: ComicProject }): ReactElement {
  const text = project.subtitle?.trim() || richTextPlainText(project.brainstormHtml);

  const startDeveloping = async (): Promise<void> => {
    const now = new Date().toISOString();
    await saveLyreflyProject({ ...project, developingAt: now, updatedAt: now }, { immediate: true });
  };

  return (
    <li className="lyrefly-sketchbook__card" data-testid={`lyrefly-idea-work-${project.id}`}>
      <button
        type="button"
        className="lyrefly-sketchbook__card-open"
        onClick={() => navigateLyreflyHash(lyreflyProjectStageHref(project.id, 'brainstorm'))}
        aria-label={`Open ${project.title}`}
      >
        <div className="lyrefly-sketchbook__card-head">
          <span className="lyrefly-sketchbook__kind">
            <AutoStoriesOutlinedIcon fontSize="inherit" aria-hidden />
            Comic
          </span>
        </div>
        <h3 className="lyrefly-sketchbook__card-title">{project.title || 'Untitled'}</h3>
        {text ? <p className="lyrefly-sketchbook__seed-body">{text}</p> : null}
      </button>
      <div className="lyrefly-sketchbook__card-actions">
        <Button size="small" onClick={() => void startDeveloping()}>
          Start developing
        </Button>
      </div>
    </li>
  );
}

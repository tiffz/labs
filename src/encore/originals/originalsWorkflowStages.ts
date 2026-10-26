export type OriginalsWorkflowStage = 'brainstorm' | 'write' | 'chords' | 'takes';

export const ORIGINALS_WORKFLOW_STAGES: ReadonlyArray<{ id: OriginalsWorkflowStage; label: string }> = [
  { id: 'brainstorm', label: 'Brainstorm' },
  { id: 'write', label: 'Write lyrics' },
  { id: 'chords', label: 'Add chords' },
  { id: 'takes', label: 'Record takes' },
] as const;

/**
 * The stages a song goes through. An instrumental has no lyrics to write, so it skips "Write
 * lyrics": Brainstorm, Add chords, Record takes. Use this, not {@link ORIGINALS_WORKFLOW_STAGES},
 * anywhere a song is in hand.
 */
export function workflowStagesFor(song: {
  instrumental?: boolean;
}): ReadonlyArray<{ id: OriginalsWorkflowStage; label: string }> {
  return song.instrumental ? ORIGINALS_WORKFLOW_STAGES.filter((s) => s.id !== 'write') : ORIGINALS_WORKFLOW_STAGES;
}

/** The stage to show when `stage` does not apply to this song (an instrumental on "Write lyrics"). */
export function applicableWorkflowStage(
  song: { instrumental?: boolean },
  stage: OriginalsWorkflowStage,
): OriginalsWorkflowStage {
  return song.instrumental && stage === 'write' ? 'chords' : stage;
}

export function workflowStageCaption(stage: OriginalsWorkflowStage): string {
  switch (stage) {
    case 'brainstorm':
      return 'Capture ideas and collect reference links, files, and notes.';
    case 'write':
      return '';
    case 'chords':
      return '';
    case 'takes':
      return '';
  }
}

export function workflowStageShortLabel(stage: OriginalsWorkflowStage): string {
  return ORIGINALS_WORKFLOW_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

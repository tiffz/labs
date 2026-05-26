export type OriginalsWorkflowStage = 'brainstorm' | 'write' | 'chords' | 'takes';

export const ORIGINALS_WORKFLOW_STAGES: ReadonlyArray<{ id: OriginalsWorkflowStage; label: string }> = [
  { id: 'brainstorm', label: 'Brainstorm' },
  { id: 'write', label: 'Write lyrics' },
  { id: 'chords', label: 'Add chords' },
  { id: 'takes', label: 'Record takes' },
] as const;

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

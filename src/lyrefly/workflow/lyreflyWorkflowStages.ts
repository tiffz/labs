export type LyreflyWorkflowStage = 'brainstorm' | 'script' | 'art' | 'publish';

export const LYREFLY_WORKFLOW_STAGES: ReadonlyArray<{ id: LyreflyWorkflowStage; label: string; caption: string }> = [
  { id: 'brainstorm', label: 'Brainstorm', caption: 'Ideas, references, and concept art' },
  { id: 'script', label: 'Script', caption: 'Nested bullet script — pages, panels, dialogue' },
  { id: 'art', label: 'Draw', caption: 'Page layouts and revision history' },
  { id: 'publish', label: 'Publish', caption: 'Release log and memorabilia' },
] as const;

export function workflowStageCaption(stage: LyreflyWorkflowStage): string {
  return LYREFLY_WORKFLOW_STAGES.find((s) => s.id === stage)?.caption ?? stage;
}

export function nextWorkflowStage(stage: LyreflyWorkflowStage): LyreflyWorkflowStage | null {
  const index = LYREFLY_WORKFLOW_STAGES.findIndex((s) => s.id === stage);
  if (index < 0 || index >= LYREFLY_WORKFLOW_STAGES.length - 1) return null;
  return LYREFLY_WORKFLOW_STAGES[index + 1]!.id;
}

export function workflowStageIndex(stage: LyreflyWorkflowStage): number {
  return LYREFLY_WORKFLOW_STAGES.findIndex((s) => s.id === stage);
}

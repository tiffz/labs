export type AnatomyTermCategory =
  | 'reference_pose'
  | 'plane'
  | 'location'
  | 'movement'
  | 'naming_prefix'
  | 'joint_type'
  | 'attachment';

export type TermVisualizationKind =
  | 'anatomical_position'
  | 'planes_overview'
  | 'plane_sagittal'
  | 'plane_coronal'
  | 'plane_transverse'
  | 'direction_arrow'
  | 'joint_motion'
  | 'example_highlight'
  | 'term_pattern_highlight'
  | 'joint_type_highlight'
  | 'text_only';

export interface AnatomyTerm {
  id: string;
  label: string;
  category: AnatomyTermCategory;
  definition: string;
  oppositeTermId?: string;
  example?: string;
  visualization: TermVisualizationKind;
  /** Optional curriculum node ids to highlight when teaching this term. */
  exampleNodeIds?: string[];
  /** For direction arrows: axis in anatomical space. */
  direction?: 'anterior' | 'posterior' | 'medial' | 'lateral' | 'superior' | 'inferior' | 'proximal' | 'distal';
}

export interface AnatomyTermLessonStep {
  termId: string;
  /** Short coach line for the lesson panel. */
  coachLine: string;
}

export interface AnatomyTermLesson {
  id: string;
  title: string;
  steps: AnatomyTermLessonStep[];
}

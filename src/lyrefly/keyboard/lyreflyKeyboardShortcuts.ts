import {
  labsCommonEditingShortcutSection,
  labsCommonHelpShortcutSection,
  type LabsKeyboardShortcutSection,
} from '../../shared/keyboardShortcuts';

export function lyreflyKeyboardShortcutSections(): LabsKeyboardShortcutSection[] {
  return [
    {
      title: 'Brainstorm',
      shortcuts: [
        {
          id: 'concept-prev-next',
          label: 'Previous / next concept art piece',
          keys: ['←', '→'],
        },
      ],
    },
    labsCommonEditingShortcutSection(),
    labsCommonHelpShortcutSection(),
  ];
}

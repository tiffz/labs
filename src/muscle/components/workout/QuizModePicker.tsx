import { useMuscleStore } from '../../store/useMuscleStore';
import type { QuizMode } from '../../types/node';

const QUIZ_MODE_OPTIONS: { id: QuizMode; label: string; hint: string }[] = [
  {
    id: 'identify_highlight',
    label: 'Name the highlight',
    hint: 'Structure glows. Pick the correct name.',
  },
  {
    id: 'locate_name',
    label: 'Find by name',
    hint: 'Name shown. Tap the structure on the model.',
  },
];

export default function QuizModePicker(): React.ReactElement | null {
  const mode = useMuscleStore((s) => s.mode);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const quizMode = useMuscleStore((s) => s.quizMode);
  const setQuizMode = useMuscleStore((s) => s.setQuizMode);

  if (mode !== 'active' || activeModuleId === 'anatomy_terms') return null;

  return (
    <fieldset className="muscle-quiz-mode-picker">
      <legend>Quiz mode for Active Reps</legend>
      {QUIZ_MODE_OPTIONS.map((opt) => (
        <label key={opt.id} className="muscle-quiz-mode-picker__option">
          <input
            type="radio"
            name="muscle-quiz-mode"
            checked={quizMode === opt.id}
            onChange={() => setQuizMode(opt.id)}
          />
          <span>
            <strong>{opt.label}</strong>
            <span className="muscle-quiz-mode-picker__hint">{opt.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

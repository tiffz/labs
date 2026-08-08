import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { useScales, hasEnabledMidiDevice } from '../store';
import ScalesInputSources from './InputSources';
import ScalePicker from './practice/ScalePicker';
import { TYPE, Icon } from './scalesUi';
import { getCustomRoutines } from '../progress/store';
import {
  ROUTINE_TEMPLATES,
  routineFromTemplate,
  createBlankRoutine,
} from '../practice/routineTemplates';
import {
  defaultPracticeItem,
  practiceItemHeadline,
  practiceItemDetail,
} from '../practice/freePracticeOptions';
import type { PracticeItem, ScalesCustomRoutine } from '../curriculum/types';

// Coarse-pointer comfort target (responsive-design §7) for the row icon controls.
const touchTarget = {
  '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 },
} as const;

/** Back button + display-small title, matching the Progress screen header. */
function ScreenHeader({
  title, onBack, backLabel, trailing,
}: { title: string; onBack: () => void; backLabel: string; trailing?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 4, md: 5 } }}>
      <IconButton
        aria-label={backLabel}
        onClick={onBack}
        sx={{ color: 'text.primary', borderRadius: '50%', width: 40, height: 40, '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Icon name="arrow_back" size={22} />
      </IconButton>
      <Typography component="h1" sx={{ ...TYPE.displaySmall, color: 'text.primary', flex: 1 }}>
        {title}
      </Typography>
      {trailing}
    </Box>
  );
}

type Mode = { view: 'list' } | { view: 'new' } | { view: 'edit'; routine: ScalesCustomRoutine };

/**
 * My Routines — build and run user-defined practice sets, in the Scales app
 * design language (TYPE scale, outlined 16px cards, emerald identity). New
 * routines start from a template and persist immediately so backing out never
 * loses them; running one plays its items in order.
 */
export default function RoutinesScreen() {
  const { state, dispatch, startRoutine } = useScales();
  const hasInput = hasEnabledMidiDevice(state) || state.microphoneActive;
  const routines = getCustomRoutines(state.progress);

  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const goHome = () => dispatch({ type: 'SET_SCREEN', screen: 'home' });

  const createAndEdit = (routine: ScalesCustomRoutine) => {
    dispatch({ type: 'SAVE_ROUTINE', routine });
    setMode({ view: 'edit', routine });
  };

  if (mode.view === 'new') {
    return (
      <TemplateChooser
        onPick={template => createAndEdit(routineFromTemplate(template))}
        onBlank={() => createAndEdit(createBlankRoutine())}
        onBack={() => setMode({ view: 'list' })}
      />
    );
  }

  if (mode.view === 'edit') {
    return (
      <RoutineEditor
        routine={mode.routine}
        hasInput={hasInput}
        onSave={routine => { dispatch({ type: 'SAVE_ROUTINE', routine }); setMode({ view: 'list' }); }}
        onStart={routine => { dispatch({ type: 'SAVE_ROUTINE', routine }); startRoutine(routine); }}
        onDelete={routine => { dispatch({ type: 'DELETE_ROUTINE', id: routine.id }); setMode({ view: 'list' }); }}
        onBack={() => setMode({ view: 'list' })}
      />
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 840, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 5, md: 8 } }}>
      <ScreenHeader
        title="Your routines"
        onBack={goHome}
        backLabel="Back to home"
        trailing={
          <Button
            variant="outlined"
            onClick={() => setMode({ view: 'new' })}
            startIcon={<Icon name="add" size={20} />}
            sx={{ ...TYPE.labelLarge, borderRadius: '999px', textTransform: 'none', flexShrink: 0 }}
          >
            New routine
          </Button>
        }
      />

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 4, md: 5 } }}>
        <ScalesInputSources />
      </Box>

      {routines.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Icon name="list_alt" size={40} />
          <Typography sx={{ ...TYPE.titleMedium, color: 'text.primary', mt: 2 }}>No routines yet</Typography>
          <Typography sx={{ ...TYPE.bodyMedium, mt: 0.5 }}>Build one from a template and play it end to end.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {routines.map(routine => (
            <Paper
              key={routine.id}
              variant="outlined"
              sx={{ p: 3, borderRadius: '16px', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ ...TYPE.titleMedium, color: 'text.primary' }} noWrap>{routine.name}</Typography>
                <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary' }}>
                  {routine.items.length} {routine.items.length === 1 ? 'item' : 'items'}
                </Typography>
              </Box>
              <IconButton aria-label={`Edit ${routine.name}`} onClick={() => setMode({ view: 'edit', routine })} sx={touchTarget}>
                <Icon name="edit" size={20} />
              </IconButton>
              <Button
                variant="contained"
                disableElevation
                disabled={!hasInput || routine.items.length === 0}
                onClick={() => startRoutine(routine)}
                startIcon={<Icon name="play_arrow" size={20} />}
                sx={{ ...TYPE.labelLarge, borderRadius: '999px', textTransform: 'none' }}
              >
                Start routine
              </Button>
            </Paper>
          ))}
        </Box>
      )}

      {!hasInput && (
        <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary', mt: 3, textAlign: 'center' }}>
          Connect MIDI or a microphone above to start a routine.
        </Typography>
      )}
    </Box>
  );
}

function TemplateChooser({
  onPick, onBlank, onBack,
}: {
  onPick: (template: (typeof ROUTINE_TEMPLATES)[number]) => void;
  onBlank: () => void;
  onBack: () => void;
}) {
  return (
    <Box sx={{ width: '100%', maxWidth: 840, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 5, md: 8 } }}>
      <ScreenHeader title="New routine" onBack={onBack} backLabel="Back to routines" />
      <Typography sx={{ ...TYPE.bodyLarge, color: 'text.secondary', mb: { xs: 4, md: 5 } }}>
        Pick a starting point, then make it yours.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ROUTINE_TEMPLATES.map(template => (
          <Paper
            key={template.id}
            variant="outlined"
            component="button"
            onClick={() => onPick(template)}
            sx={{
              p: 3, borderRadius: '16px', textAlign: 'left', cursor: 'pointer',
              border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
              '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
            }}
          >
            <Typography sx={{ ...TYPE.titleMedium, color: 'text.primary' }}>{template.name}</Typography>
            <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary', mt: 0.5 }}>{template.description}</Typography>
          </Paper>
        ))}
        <Button variant="text" onClick={onBlank} sx={{ ...TYPE.labelLarge, color: 'primary.main', alignSelf: 'flex-start', textTransform: 'none' }}>
          Start from scratch
        </Button>
      </Box>
    </Box>
  );
}

function RoutineEditor({
  routine: initial, hasInput, onSave, onStart, onDelete, onBack,
}: {
  routine: ScalesCustomRoutine;
  hasInput: boolean;
  onSave: (routine: ScalesCustomRoutine) => void;
  onStart: (routine: ScalesCustomRoutine) => void;
  onDelete: (routine: ScalesCustomRoutine) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [items, setItems] = useState<PracticeItem[]>(initial.items);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<PracticeItem>(defaultPracticeItem());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const current = (): ScalesCustomRoutine => ({ ...initial, name: name.trim() || 'My routine', items });
  const handleBack = () => (items.length > 0 ? onSave(current()) : onBack());

  const move = (index: number, delta: number) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setItems(next);
  };
  const remove = (index: number) => setItems(items.filter((_, i) => i !== index));
  const openAdd = () => { setDraft(defaultPracticeItem()); setEditIndex(-1); };
  const openEdit = (index: number) => { setDraft(items[index]!); setEditIndex(index); };
  const commitDraft = () => {
    if (editIndex === -1) setItems([...items, draft]);
    else if (editIndex !== null) setItems(items.map((it, i) => (i === editIndex ? draft : it)));
    setEditIndex(null);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 840, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 5, md: 8 } }}>
      <ScreenHeader
        title="Edit routine"
        onBack={handleBack}
        backLabel="Back to routines"
        trailing={
          <IconButton aria-label="Delete routine" onClick={() => setConfirmDelete(true)} sx={touchTarget}>
            <Icon name="delete" size={22} />
          </IconButton>
        }
      />

      <TextField label="Routine name" value={name} onChange={e => setName(e.target.value)} fullWidth sx={{ mb: { xs: 4, md: 5 } }} />

      <Typography sx={{ ...TYPE.labelMedium, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        Practice items
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {items.map((it, index) => (
          <Paper
            key={index}
            variant="outlined"
            sx={{ p: 1.5, borderRadius: '16px', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <ButtonBase
              onClick={() => openEdit(index)}
              aria-label={`Edit ${practiceItemHeadline(it)}`}
              focusRipple
              sx={{
                flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', p: 1, borderRadius: '10px',
                '&:hover': { bgcolor: 'action.hover' },
                '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ ...TYPE.titleMedium, color: 'text.primary' }} noWrap>{practiceItemHeadline(it)}</Typography>
                <Typography sx={{ ...TYPE.bodySmall, color: 'text.secondary' }} noWrap>{practiceItemDetail(it)}</Typography>
              </Box>
            </ButtonBase>
            <IconButton size="small" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} sx={touchTarget}>
              <Icon name="arrow_upward" size={18} />
            </IconButton>
            <IconButton size="small" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)} sx={touchTarget}>
              <Icon name="arrow_downward" size={18} />
            </IconButton>
            <IconButton size="small" aria-label={`Remove ${practiceItemHeadline(it)}`} onClick={() => remove(index)} sx={{ ...touchTarget, ml: 0.5, color: 'text.secondary' }}>
              <Icon name="close" size={18} />
            </IconButton>
          </Paper>
        ))}
      </Box>

      <Button variant="text" onClick={openAdd} startIcon={<Icon name="add" size={20} />} sx={{ ...TYPE.labelLarge, color: 'primary.main', mt: 2, textTransform: 'none' }}>
        Add an exercise
      </Button>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: { xs: 4, md: 5 } }}>
        <Button
          variant="contained" disableElevation disabled={!hasInput || items.length === 0}
          onClick={() => onStart(current())} startIcon={<Icon name="play_arrow" size={20} />}
          sx={{ ...TYPE.labelLarge, borderRadius: '999px', px: 4, height: 48, textTransform: 'none' }}
        >
          Start routine
        </Button>
        <Button
          variant="outlined" disabled={items.length === 0} onClick={() => onSave(current())}
          sx={{ ...TYPE.labelLarge, borderRadius: '999px', px: 3, height: 48, textTransform: 'none' }}
        >
          Save
        </Button>
      </Box>

      {!hasInput && (
        <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary', mt: 2 }}>
          Connect MIDI or a microphone to start this routine.
        </Typography>
      )}

      <Dialog open={editIndex !== null} onClose={() => setEditIndex(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ ...TYPE.titleLarge }}>{editIndex === -1 ? 'Add an exercise' : 'Edit exercise'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <ScalePicker value={draft} onChange={setDraft} idPrefix="routine-item" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditIndex(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={commitDraft} sx={{ textTransform: 'none' }}>
            {editIndex === -1 ? 'Add' : 'Done'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle sx={{ ...TYPE.titleLarge }}>Delete this routine?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ ...TYPE.bodyMedium }}>
            {`"${name.trim() || 'My routine'}" will be removed from all your devices. This can't be undone.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button color="error" onClick={() => onDelete(initial)} sx={{ textTransform: 'none' }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

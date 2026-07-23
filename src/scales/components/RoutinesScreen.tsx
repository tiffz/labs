import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useScales, hasEnabledMidiDevice } from '../store';
import ScalePicker from './practice/ScalePicker';
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

function MSym({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

type Mode = { view: 'list' } | { view: 'new' } | { view: 'edit'; routine: ScalesCustomRoutine };

/**
 * My Routines — build and run user-defined practice sets on autopilot. The
 * list is the home; "New routine" always starts from a template (never a blank
 * canvas) with a "Start from scratch" escape hatch. Running a routine plays its
 * items in the exact order set.
 */
export default function RoutinesScreen() {
  const { state, dispatch, startRoutine } = useScales();
  const hasInput = hasEnabledMidiDevice(state) || state.microphoneActive;
  const routines = getCustomRoutines(state.progress);

  const [mode, setMode] = useState<Mode>({ view: 'list' });

  const goHome = () => dispatch({ type: 'SET_SCREEN', screen: 'home' });

  if (mode.view === 'new') {
    return (
      <TemplateChooser
        onPick={template => setMode({ view: 'edit', routine: routineFromTemplate(template) })}
        onBlank={() => setMode({ view: 'edit', routine: createBlankRoutine() })}
        onBack={() => setMode({ view: 'list' })}
      />
    );
  }

  if (mode.view === 'edit') {
    return (
      <RoutineEditor
        routine={mode.routine}
        hasInput={hasInput}
        onSave={routine => {
          dispatch({ type: 'SAVE_ROUTINE', routine });
          setMode({ view: 'list' });
        }}
        onStart={routine => {
          dispatch({ type: 'SAVE_ROUTINE', routine });
          startRoutine(routine);
        }}
        onDelete={routine => {
          dispatch({ type: 'DELETE_ROUTINE', id: routine.id });
          setMode({ view: 'list' });
        }}
        onBack={() => setMode({ view: 'list' })}
      />
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', px: { xs: 3, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={goHome} aria-label="Back to home" size="small">
          <MSym name="arrow_back" />
        </IconButton>
        <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 500, flex: 1 }}>
          My routines
        </Typography>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setMode({ view: 'new' })}
          startIcon={<MSym name="add" size={20} />}
          sx={{ borderRadius: '999px' }}
        >
          New routine
        </Button>
      </Box>

      {routines.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <MSym name="list_alt" size={40} />
          <Typography sx={{ mt: 2, fontWeight: 500 }}>No routines yet</Typography>
          <Typography sx={{ mt: 0.5 }}>Build one from a template and run it on autopilot.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {routines.map(routine => (
            <Paper
              key={routine.id}
              variant="outlined"
              sx={{ p: 2.5, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 500 }}>{routine.name}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  {routine.items.length} {routine.items.length === 1 ? 'item' : 'items'}
                </Typography>
              </Box>
              <IconButton
                aria-label={`Edit ${routine.name}`}
                onClick={() => setMode({ view: 'edit', routine })}
              >
                <MSym name="edit" />
              </IconButton>
              <Button
                variant="contained"
                disableElevation
                disabled={!hasInput || routine.items.length === 0}
                onClick={() => startRoutine(routine)}
                startIcon={<MSym name="play_arrow" size={20} />}
                sx={{ borderRadius: '999px' }}
              >
                Start routine
              </Button>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

function TemplateChooser({
  onPick,
  onBlank,
  onBack,
}: {
  onPick: (template: (typeof ROUTINE_TEMPLATES)[number]) => void;
  onBlank: () => void;
  onBack: () => void;
}) {
  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', px: { xs: 3, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={onBack} aria-label="Back to routines" size="small">
          <MSym name="arrow_back" />
        </IconButton>
        <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 500 }}>
          Start a routine
        </Typography>
      </Box>
      <Typography sx={{ color: 'text.secondary', mb: 3 }}>
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
              p: 2.5,
              borderRadius: '12px',
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
              '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
            }}
          >
            <Typography sx={{ fontWeight: 500 }}>{template.name}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>
              {template.description}
            </Typography>
          </Paper>
        ))}
        <Button variant="text" onClick={onBlank} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
          Start from scratch
        </Button>
      </Box>
    </Box>
  );
}

function RoutineEditor({
  routine: initial,
  hasInput,
  onSave,
  onStart,
  onDelete,
  onBack,
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
  // editIndex: null = closed, -1 = adding a new item, >=0 = editing that item.
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<PracticeItem>(defaultPracticeItem());

  const current = (): ScalesCustomRoutine => ({ ...initial, name: name.trim() || 'My routine', items });

  const move = (index: number, delta: number) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setItems(next);
  };

  const remove = (index: number) => setItems(items.filter((_, i) => i !== index));

  const openAdd = () => {
    setDraft(defaultPracticeItem());
    setEditIndex(-1);
  };
  const openEdit = (index: number) => {
    setDraft(items[index]!);
    setEditIndex(index);
  };
  const commitDraft = () => {
    if (editIndex === -1) setItems([...items, draft]);
    else if (editIndex !== null) setItems(items.map((it, i) => (i === editIndex ? draft : it)));
    setEditIndex(null);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', px: { xs: 3, sm: 4 }, py: { xs: 3, md: 5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={onBack} aria-label="Back to routines" size="small">
          <MSym name="arrow_back" />
        </IconButton>
        <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 500, flex: 1 }}>
          Edit routine
        </Typography>
        <IconButton aria-label="Delete routine" onClick={() => onDelete(initial)}>
          <MSym name="delete" />
        </IconButton>
      </Box>

      <TextField
        label="Routine name"
        value={name}
        onChange={e => setName(e.target.value)}
        fullWidth
        sx={{ mb: 4 }}
      />

      <Typography sx={{ fontWeight: 500, mb: 1.5 }}>Practice items</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {items.map((it, index) => (
          <Paper
            key={index}
            variant="outlined"
            sx={{ p: 2, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 500 }}>{practiceItemHeadline(it)}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                {practiceItemDetail(it)}
              </Typography>
            </Box>
            <IconButton size="small" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
              <MSym name="arrow_upward" size={18} />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Move down"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              <MSym name="arrow_downward" size={18} />
            </IconButton>
            <IconButton size="small" aria-label={`Edit ${practiceItemHeadline(it)}`} onClick={() => openEdit(index)}>
              <MSym name="edit" size={18} />
            </IconButton>
            <IconButton size="small" aria-label={`Remove ${practiceItemHeadline(it)}`} onClick={() => remove(index)}>
              <MSym name="close" size={18} />
            </IconButton>
          </Paper>
        ))}
      </Box>

      <Button
        variant="text"
        onClick={openAdd}
        startIcon={<MSym name="add" size={20} />}
        sx={{ mt: 2, textTransform: 'none' }}
      >
        Add a scale
      </Button>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 5 }}>
        <Button
          variant="contained"
          disableElevation
          disabled={!hasInput || items.length === 0}
          onClick={() => onStart(current())}
          startIcon={<MSym name="play_arrow" size={20} />}
          sx={{ borderRadius: '999px', px: 4, height: 48 }}
        >
          Start routine
        </Button>
        <Button
          variant="outlined"
          onClick={() => onSave(current())}
          sx={{ borderRadius: '999px', px: 3, height: 48 }}
        >
          Save
        </Button>
      </Box>

      <Dialog open={editIndex !== null} onClose={() => setEditIndex(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editIndex === -1 ? 'Add a scale' : 'Edit scale'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <ScalePicker value={draft} onChange={setDraft} idPrefix="routine-item" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditIndex(null)}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={commitDraft}>
            {editIndex === -1 ? 'Add' : 'Done'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
